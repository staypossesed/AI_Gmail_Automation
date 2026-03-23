/**
 * AI Processing Pipeline
 * Runs when user connects Gmail: fetch → store → classify → detect → extract → insights
 */

import { prisma } from "@/lib/database";
import { fetchEmails } from "@/lib/gmail/client";
import {
  classifyEmail,
  extractSubscriptionDetails,
  extractDeadline,
  generateInsights,
} from "@/lib/ai/gemini";

// Event hooks for future automation (n8n integration)
export type PipelineEvent = "emails_fetched" | "email_classified" | "subscription_detected" | "reminder_created" | "insights_generated";

export const pipelineEventHooks: Record<PipelineEvent, ((payload: unknown) => void)[]> = {
  emails_fetched: [],
  email_classified: [],
  subscription_detected: [],
  reminder_created: [],
  insights_generated: [],
};

function emit(event: PipelineEvent, payload: unknown) {
  pipelineEventHooks[event].forEach((fn) => {
    try {
      fn(payload);
    } catch (e) {
      console.error(`Pipeline hook error [${event}]:`, e);
    }
  });
}

/**
 * Classify up to N emails that have no classification yet.
 * Called after quick fetch so all emails eventually get a category.
 */
export async function classifyUnclassifiedEmails(
  userId: string,
  limit = 5
): Promise<{ classified: number }> {
  const unclassified = await prisma.emailMessage.findMany({
    where: { userId, classification: null },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  let classified = 0;
  for (const email of unclassified) {
    try {
      const classification = await classifyEmail(
        email.sender,
        email.subject,
        email.snippet
      );
      const raw = classification.type?.toLowerCase().trim() ?? "";
      const type = ["subscription", "bill", "appointment", "important", "personal", "spam", "irrelevant"].includes(raw)
        ? raw
        : "irrelevant";

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          classification: type,
          classificationData: classification as unknown as object,
          processedAt: new Date(),
        },
      });
      classified++;
      emit("email_classified", { userId, emailId: email.gmailId, classification: type });
    } catch (err) {
      console.warn("Classification failed for email", email.id, err);
    }
  }
  return { classified };
}

/**
 * Re-classify emails in wrong categories: "irrelevant" and "personal" (often misclassified).
 */
export async function reclassifyWrongEmails(
  userId: string,
  limit = 8
): Promise<{ classified: number }> {
  const toReclassify = await prisma.emailMessage.findMany({
    where: {
      userId,
      classification: { in: ["irrelevant", "personal"] },
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  let classified = 0;
  for (const email of toReclassify) {
    try {
      const classification = await classifyEmail(
        email.sender,
        email.subject,
        email.snippet
      );
      const raw = classification.type?.toLowerCase().trim() ?? "";
      const type = ["subscription", "bill", "appointment", "important", "personal", "spam", "irrelevant"].includes(raw)
        ? raw
        : "irrelevant";

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          classification: type,
          classificationData: classification as unknown as object,
          processedAt: new Date(),
        },
      });
      classified++;
      emit("email_classified", { userId, emailId: email.gmailId, classification: type });
    } catch (err) {
      console.warn("Re-classification failed for email", email.id, err);
    }
  }
  return { classified };
}

/**
 * Re-classify emails that already have a category (fix wrong classifications).
 */
export async function reclassifyEmails(
  userId: string,
  limit = 30
): Promise<{ classified: number }> {
  const toReclassify = await prisma.emailMessage.findMany({
    where: { userId, classification: { not: null } },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  let classified = 0;
  for (const email of toReclassify) {
    try {
      const classification = await classifyEmail(
        email.sender,
        email.subject,
        email.snippet
      );
      const raw = classification.type?.toLowerCase().trim() ?? "";
      const type = ["subscription", "bill", "appointment", "important", "personal", "spam", "irrelevant"].includes(raw)
        ? raw
        : "irrelevant";

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          classification: type,
          classificationData: classification as unknown as object,
          processedAt: new Date(),
        },
      });
      classified++;
      emit("email_classified", { userId, emailId: email.gmailId, classification: type });
    } catch (err) {
      console.warn("Re-classification failed for email", email.id, err);
    }
  }
  return { classified };
}

/**
 * Quick fetch: fetch from Gmail, store, then classify unclassified emails.
 * Keeps inbox updated and ensures all emails get a category.
 */
export async function runQuickFetch(userId: string): Promise<{ success: boolean; error?: string }> {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) return { success: false, error: "Gmail not connected" };

  try {
    const emails = await fetchEmails(token, 200);
    const existingIds = new Set(
      (await prisma.emailMessage.findMany({ where: { userId }, select: { gmailId: true } })).map(
        (e) => e.gmailId
      )
    );

    for (const email of emails) {
      if (existingIds.has(email.id)) continue;
      await prisma.emailMessage.upsert({
        where: { userId_gmailId: { userId, gmailId: email.id } },
        create: {
          userId,
          gmailId: email.id,
          threadId: email.threadId,
          sender: email.sender,
          subject: email.subject,
          snippet: email.snippet,
          receivedAt: email.receivedAt,
        },
        update: {},
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Quick fetch error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Fetch failed" };
  }
}

export async function runPipeline(userId: string): Promise<{ success: boolean; error?: string }> {
  const token = await prisma.gmailToken.findUnique({
    where: { userId },
  });

  if (!token) {
    return { success: false, error: "Gmail not connected" };
  }

  try {
    // 1. Fetch emails from Gmail API
    const emails = await fetchEmails(token, 200);
    emit("emails_fetched", { userId, count: emails.length });

    // 2. Store metadata, skip already processed
    const existingIds = new Set(
      (await prisma.emailMessage.findMany({ where: { userId }, select: { gmailId: true } })).map(
        (e) => e.gmailId
      )
    );

    const toProcess: typeof emails = [];
    for (const email of emails) {
      if (existingIds.has(email.id)) continue;

      await prisma.emailMessage.upsert({
        where: {
          userId_gmailId: { userId, gmailId: email.id },
        },
        create: {
          userId,
          gmailId: email.id,
          threadId: email.threadId,
          sender: email.sender,
          subject: email.subject,
          snippet: email.snippet,
          receivedAt: email.receivedAt,
        },
        update: {},
      });
      toProcess.push(email);
    }

    // 3–6. Classify and process each new email (one at a time for AI context isolation)
    for (const email of toProcess) {
      const classification = await classifyEmail(email.sender, email.subject, email.snippet);
      emit("email_classified", { userId, emailId: email.id, classification });

      const dbEmail = await prisma.emailMessage.findFirst({
        where: { userId, gmailId: email.id },
      });
      if (!dbEmail) continue;

      await prisma.emailMessage.update({
        where: { id: dbEmail.id },
        data: {
          classification: classification.type,
          classificationData: classification as unknown as object,
          processedAt: new Date(),
        },
      });

      // 4. Subscription detection
      if (classification.type === "subscription" && classification.confidence >= 0.7) {
        const details = await extractSubscriptionDetails(
          email.sender,
          email.subject,
          email.snippet
        );

        const lastBilling = details.lastBillingDate
          ? new Date(details.lastBillingDate)
          : email.receivedAt;

        const existing = await prisma.subscription.findFirst({
          where: { userId, name: details.name },
        });
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              estimatedPrice: details.estimatedPrice,
              billingFrequency: details.billingFrequency,
              lastBillingDate: lastBilling,
              sourceEmailId: dbEmail.id,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              name: details.name,
              estimatedPrice: details.estimatedPrice,
              billingFrequency: details.billingFrequency,
              lastBillingDate: lastBilling,
              sourceEmailId: dbEmail.id,
            },
          });
        }

        emit("subscription_detected", { userId, name: details.name });
      }

      // 5. Reminder extraction (bills, appointments)
      if (
        (classification.type === "bill" || classification.type === "appointment") &&
        (classification.deadline || classification.confidence >= 0.6)
      ) {
        const deadline = classification.deadline
          ? new Date(classification.deadline)
          : (await extractDeadline(email.subject, email.snippet)).dueDate
            ? new Date((await extractDeadline(email.subject, email.snippet)).dueDate!)
            : null;

        if (deadline && deadline > new Date()) {
          await prisma.reminder.create({
            data: {
              userId,
              title: classification.summary || email.subject.slice(0, 100),
              dueDate: deadline,
              sourceEmailId: dbEmail.id,
            },
          });
          emit("reminder_created", { userId, title: email.subject });
        }
      }
    }

    // 7. Generate insights
    const [subscriptions, reminders, importantEmails] = await Promise.all([
      prisma.subscription.findMany({ where: { userId } }),
      prisma.reminder.findMany({
        where: { userId, completed: false, dueDate: { gte: new Date() } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.emailMessage.count({
        where: { userId, classification: "important" },
      }),
    ]);

    const subscriptionTotal = subscriptions.reduce((s, sub) => s + (sub.estimatedPrice || 0), 0);
    const insightStrings = await generateInsights({
      subscriptionCount: subscriptions.length,
      subscriptionTotal,
      reminderCount: reminders.length,
      importantEmailCount: importantEmails,
      upcomingReminders: reminders.map((r) => ({
        title: r.title,
        dueDate: r.dueDate.toISOString().slice(0, 10),
      })),
    });

    for (const text of insightStrings) {
      await prisma.aIInsight.create({
        data: { userId, insightText: text },
      });
    }
    emit("insights_generated", { userId, count: insightStrings.length });

    // Classify any remaining unclassified emails (from quick fetch)
    await classifyUnclassifiedEmails(userId, 50);

    return { success: true };
  } catch (err) {
    console.error("Pipeline error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Pipeline failed",
    };
  }
}

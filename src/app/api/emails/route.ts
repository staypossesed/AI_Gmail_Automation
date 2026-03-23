import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/emails
 * Returns email summaries with classification.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const classification = searchParams.get("classification");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const where: { userId: string; classification?: string | { in: string[] } } = { userId: user.id };
    if (classification === "subscriptions_bills") {
      where.classification = { in: ["subscription", "bill"] };
    } else if (classification) {
      where.classification = classification;
    }

    const emails = await prisma.emailMessage.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: {
        id: true,
        gmailId: true,
        sender: true,
        subject: true,
        snippet: true,
        receivedAt: true,
        classification: true,
      },
    });

    return NextResponse.json(emails);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

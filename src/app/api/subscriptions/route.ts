import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/subscriptions
 * Returns detected subscriptions for the user.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        sourceEmail: {
          select: { subject: true, sender: true, receivedAt: true },
        },
      },
    });

    return NextResponse.json(subscriptions);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

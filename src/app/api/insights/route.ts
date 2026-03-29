import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/insights
 * Returns AI-generated insights for the dashboard.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const insights = await prisma.aIInsight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(insights);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

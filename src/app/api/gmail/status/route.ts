import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/gmail/status
 * Returns whether Gmail is connected for the user.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const token = await prisma.gmailToken.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ connected: !!token });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

const VALID_CLASSIFICATIONS = ["subscription", "bill", "appointment", "important", "personal", "spam", "irrelevant"];

/**
 * PATCH /api/emails/[id]
 * Update email classification (manual override).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { classification } = body;

    if (!classification || !VALID_CLASSIFICATIONS.includes(classification)) {
      return NextResponse.json({ error: "Invalid classification" }, { status: 400 });
    }

    const updated = await prisma.emailMessage.updateMany({
      where: { id, userId: user.id },
      data: { classification },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, classification });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

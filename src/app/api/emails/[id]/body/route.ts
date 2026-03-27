import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { fetchMessageBody } from "@/lib/gmail/client";

/**
 * GET /api/emails/[id]/body
 * Fetches full email body from Gmail for the given email (by our DB id).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const email = await prisma.emailMessage.findFirst({
      where: { id, userId: user.id },
      select: { gmailId: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const token = await prisma.gmailToken.findUnique({
      where: { userId: user.id },
    });

    if (!token) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const { plain, html } = await fetchMessageBody(token, email.gmailId);
    return NextResponse.json({ body: plain, html: html || undefined });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

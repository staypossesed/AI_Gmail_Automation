import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runQuickFetch } from "@/lib/pipeline";

/**
 * POST /api/gmail/fetch
 * Quick fetch: fetches emails from Gmail and stores them. No AI processing.
 * Use for fast inbox updates (emails appear in seconds).
 */
export async function POST() {
  try {
    const user = await requireAuth();
    const result = await runQuickFetch(user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

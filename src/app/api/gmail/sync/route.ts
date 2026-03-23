import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";

/**
 * POST /api/gmail/sync
 * Triggers the full processing pipeline: fetch emails, classify, detect subscriptions, extract reminders, generate insights.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    const result = await runPipeline(user.id);

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

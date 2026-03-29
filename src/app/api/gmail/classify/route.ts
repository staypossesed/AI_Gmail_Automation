import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { classifyUnclassifiedEmails, reclassifyEmails, reclassifyWrongEmails } from "@/lib/pipeline";

/**
 * POST /api/gmail/classify
 * Classifies unclassified emails + reclassifies "Other" (often wrong).
 * Use ?reclassify=true to re-classify all existing.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const reclassify = request.nextUrl.searchParams.get("reclassify") === "true";

    if (reclassify) {
      const { classified } = await reclassifyEmails(user.id, 30);
      return NextResponse.json({ success: true, classified });
    }

    const { classified: c1 } = await classifyUnclassifiedEmails(user.id, 10);
    const { classified: c2 } = await reclassifyWrongEmails(user.id, 8);
    return NextResponse.json({ success: true, classified: c1 + c2 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthUrl } from "@/lib/gmail/client";

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow for Gmail access.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use request URL so callback matches actual host/port (avoids ERR_CONNECTION_REFUSED)
  const url = getAuthUrl(request.url);
  return NextResponse.redirect(url);
}

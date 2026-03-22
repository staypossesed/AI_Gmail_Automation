import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTokensFromCode } from "@/lib/gmail/client";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback, stores tokens, redirects to settings.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    const errorParam = error === "access_denied" ? "access_denied" : "oauth";
    return NextResponse.redirect(new URL(`/settings?error=${errorParam}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", request.url));
  }

  try {
    // redirect_uri must match exactly what was sent in the auth request
    const redirectUri = `${new URL(request.url).origin}${new URL(request.url).pathname}`;
    const tokens = await getTokensFromCode(code, redirectUri);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens");
    }

    const user = await getOrCreateUser();
    if (!user) throw new Error("User not found");

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await prisma.gmailToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });

    return NextResponse.redirect(new URL("/settings?connected=gmail", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/settings?error=callback", request.url));
  }
}

import { google } from "googleapis";
import { GmailToken } from "@prisma/client";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export interface GmailMessageMetadata {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
}

/**
 * Create OAuth2 client for Gmail API.
 * @param redirectUri - Optional. Uses request origin when provided so callback matches actual port.
 */
export function createOAuth2Client(redirectUri?: string) {
  const base =
    redirectUri ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const callback = base.endsWith("/api/auth/google/callback")
    ? base
    : `${base.replace(/\/$/, "")}/api/auth/google/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callback
  );
}

/**
 * Get authorization URL for Google OAuth.
 * @param requestUrl - Optional. Request URL (e.g. from request.url) so callback uses actual host/port.
 */
export function getAuthUrl(requestUrl?: string): string {
  const redirectUri = requestUrl
    ? new URL("/api/auth/google/callback", requestUrl).toString()
    : undefined;
  const oauth2 = createOAuth2Client(redirectUri);
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
  });
}

/**
 * Exchange code for tokens.
 * @param code - Authorization code from Google
 * @param redirectUri - Must match the redirect_uri used in the auth request (e.g. from callback request URL)
 */
export async function getTokensFromCode(code: string, redirectUri?: string) {
  const oauth2 = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

/**
 * Fetch last N emails from Gmail (metadata only).
 */
export async function fetchEmails(
  token: GmailToken,
  maxResults = 200
): Promise<GmailMessageMetadata[]> {
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  oauth2.on("tokens", async (tokens) => {
    // Token refresh - would need to persist to DB in production
    if (tokens.refresh_token) {
      // Update refresh token if rotated
    }
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const messages = response.data.messages || [];
  const BATCH_SIZE = 15; // Parallel fetches to avoid rate limits
  const results: GmailMessageMetadata[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.all(
      batch
        .filter((m) => m.id)
        .map(async (msg) => {
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          });
          const headers = full.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
          const from = getHeader("From");
          const subject = getHeader("Subject");
          const snippet = (full.data.snippet as string) || "";
          const internalDate = full.data.internalDate;
          const receivedAt = internalDate ? new Date(parseInt(internalDate, 10)) : new Date();
          const senderMatch = from.match(/<([^>]+)>/) || from.match(/(\S+@\S+)/);
          const sender = senderMatch ? senderMatch[1].trim() : from;
          return {
            id: msg.id!,
            threadId: full.data.threadId || "",
            sender,
            subject,
            snippet,
            receivedAt,
          };
        })
    );
    results.push(...fetched);
  }

  return results;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

type MessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: MessagePart[];
};

function extractPartBody(part: MessagePart): string {
  const data = part?.body?.data;
  return data ? decodeBase64Url(data) : "";
}

function collectBodiesFromPart(
  part: MessagePart,
  out: { plain: string; html: string }
): void {
  if (!part) return;
  if (part.mimeType === "text/plain") {
    const body = extractPartBody(part);
    if (body && !out.plain) out.plain = body;
    return;
  }
  if (part.mimeType === "text/html") {
    const body = extractPartBody(part);
    if (body && !out.html) out.html = body;
    return;
  }
  if (part.parts?.length) {
    for (const p of part.parts) {
      collectBodiesFromPart(p, out);
    }
  } else if (!out.plain && !out.html) {
    const data = part.body?.data;
    if (data) out.plain = decodeBase64Url(data);
  }
}

function extractBodiesFromPayload(payload: MessagePart | undefined): {
  plain: string;
  html: string;
} {
  const out = { plain: "", html: "" };
  if (!payload) return out;
  collectBodiesFromPart(payload, out);
  if (!out.plain && !out.html && payload.body?.data) {
    out.plain = decodeBase64Url(payload.body.data);
  }
  return out;
}

export interface EmailBody {
  plain: string;
  html: string;
}

/**
 * Fetch full email body from Gmail by message ID.
 * Returns both plain text and HTML when available.
 */
export async function fetchMessageBody(
  token: GmailToken,
  gmailId: string
): Promise<EmailBody> {
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: gmailId,
    format: "full",
  });

  const payload = msg.data.payload as MessagePart | undefined;
  return extractBodiesFromPayload(payload);
}

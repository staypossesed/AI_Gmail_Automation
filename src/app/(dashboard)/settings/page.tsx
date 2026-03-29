"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
    fetch("/api/gmail/status")
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((data) => setGmailConnected(data.connected));
  }, []);

  const error = searchParams?.get("error");
  const connected = searchParams?.get("connected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage connected accounts
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div className="text-sm">
            {error === "access_denied" && (
              <>
                <p className="font-medium">Access blocked by Google</p>
                <p className="mt-1 text-muted-foreground">
                  The app is in testing mode. Add your email as a Test User in Google Cloud Console → APIs &amp; Services → OAuth consent screen → Test users.
                </p>
              </>
            )}
            {error === "oauth" && "Google sign-in was denied or failed. Please try again."}
            {error === "no_code" && "No authorization code received. Please try connecting again."}
            {error === "callback" && "Failed to save Gmail connection. Please try again."}
          </div>
        </div>
      )}

      {connected === "gmail" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>Gmail connected successfully.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail
          </CardTitle>
          <CardDescription>
            Connect Gmail to analyze emails for subscriptions, bills, and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {gmailConnected === null ? (
              <span className="text-muted-foreground">Checking...</span>
            ) : gmailConnected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
          <a
            href="/api/auth/google"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {gmailConnected ? "Reconnect" : "Connect Gmail"}
          </a>
        </CardContent>
      </Card>

    </div>
  );
}

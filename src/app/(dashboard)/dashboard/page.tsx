"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InsightCard } from "@/components/insight-card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Mail } from "lucide-react";

interface Insight {
  id: string;
  insightText: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

  const fetchInsights = async () => {
    const res = await fetch("/api/insights");
    if (res.ok) {
      const data = await res.json();
      setInsights(data);
    }
    setLoading(false);
  };

  const fetchGmailStatus = async () => {
    const res = await fetch("/api/gmail/status");
    if (res.ok) {
      const data = await res.json();
      setGmailConnected(data.connected);
    } else {
      setGmailConnected(false);
    }
  };

  const handleSync = async () => {
    if (!gmailConnected) {
      router.push("/settings");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.ok) {
        if (typeof window !== "undefined") sessionStorage.setItem("lastFullSync", String(Date.now()));
        await fetchInsights();
      } else {
        const err = await res.json();
        alert(err.error || "Sync failed");
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchGmailStatus();
    fetchInsights();
  }, []);

  // Auto-sync when Gmail is connected, but only if we haven't synced recently (prevents Gemini 429 rate limits)
  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes - full sync uses AI on every email
  useEffect(() => {
    if (!gmailConnected) return;
    const lastSync = typeof window !== "undefined" ? parseInt(sessionStorage.getItem("lastFullSync") || "0", 10) : 0;
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) {
      fetchInsights(); // Just refresh insights, skip full sync
      return;
    }
    const sync = async () => {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.ok) {
        sessionStorage.setItem("lastFullSync", String(Date.now()));
        fetchInsights();
      }
    };
    sync();
  }, [gmailConnected]);

  const showConnectPrompt = gmailConnected === false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insight Feed</h1>
          <p className="text-muted-foreground">
            AI-generated insights to help you manage your life
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing || gmailConnected === null}
          variant={showConnectPrompt ? "outline" : "default"}
        >
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : showConnectPrompt ? (
            <Mail className="mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {showConnectPrompt ? "Connect Gmail" : "Sync Gmail"}
        </Button>
      </div>

      {showConnectPrompt && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
          <p className="text-sm">
            Gmail is not connected.{" "}
            <Link href="/settings" className="underline font-medium hover:no-underline">
              Connect Gmail in Settings
            </Link>{" "}
            to sync emails and get AI insights.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : insights.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No insights yet. Connect Gmail and sync to get started.
          </p>
          <Button
            onClick={handleSync}
            disabled={syncing || gmailConnected === null}
            variant={showConnectPrompt ? "outline" : "default"}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : showConnectPrompt ? (
              <Mail className="mr-2 h-4 w-4" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {showConnectPrompt ? "Connect Gmail" : "Sync Gmail"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              text={insight.insightText}
              createdAt={insight.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

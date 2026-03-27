"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EmailSummary } from "@/components/email-summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Email {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  classification: string | null;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchEmails = useCallback(() => {
    const id = ++fetchIdRef.current;
    const base = filter ? `/api/emails?classification=${filter}` : "/api/emails";
    const url = `${base}${base.includes("?") ? "&" : "?"}limit=100`;
    fetch(url)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Fetch failed")))
      .then((data) => {
        if (id === fetchIdRef.current && Array.isArray(data)) setEmails(data);
      })
      .catch(() => {
        if (id === fetchIdRef.current) setEmails((prev) => prev);
      })
      .finally(() => {
        if (id === fetchIdRef.current) setLoading(false);
      });
  }, [filter]);

  const handleCategoryChange = useCallback((v: string) => {
    setFilter(v === "all" ? null : v);
    setLoading(true);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/fetch", { method: "POST" });
      if (res.ok) fetchEmails();
    } finally {
      setSyncing(false);
    }
  }, [fetchEmails]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Quick fetch every 15s - avoid aggressive refresh that feels like "clearing"
  useEffect(() => {
    const sync = async () => {
      const res = await fetch("/api/gmail/fetch", { method: "POST" });
      if (res.ok) fetchEmails();
    };
    sync();
    const interval = setInterval(sync, 15_000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  // Classify unclassified emails every 30s (AI is slow - separate from fast 5s fetch)
  useEffect(() => {
    let classifying = false;
    const runClassify = async () => {
      if (classifying) return;
      classifying = true;
      try {
        await fetch("/api/gmail/classify", { method: "POST" });
        fetchEmails();
      } finally {
        classifying = false;
      }
    };
    const t = setTimeout(runClassify, 5_000);
    const interval = setInterval(runClassify, 30_000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [fetchEmails]);

  const categories = [
    { value: "all", label: "All" },
    { value: "appointment", label: "Appointments" },
    { value: "important", label: "Important" },
    { value: "personal", label: "Personal" },
    { value: "subscriptions_bills", label: "Subscriptions & Bills" },
    { value: "spam", label: "Spam" },
    { value: "irrelevant", label: "Other" },
  ];

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Categories at the very top */}
      <Tabs value={filter || "all"} onValueChange={handleCategoryChange} className="w-full">
        <div className="flex flex-col gap-4 w-full">
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <TabsList className="inline-flex w-max min-w-full flex-row flex-wrap items-center gap-2 p-2 min-h-10 [&>button]:flex-none [&>button]:!h-8 [&>button]:px-4 [&>button]:items-center [&>button]:justify-center [&>button[data-active]]:bg-primary [&>button[data-active]]:text-primary-foreground [&>button[data-active]]:shadow-sm">
              {categories.map((c) => (
                <TabsTrigger key={c.value} value={c.value}>
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox Summaries</h1>
              <p className="text-muted-foreground text-sm">
                {filter ? `Showing ${filter === "subscriptions_bills" ? "subscriptions & bills" : filter} emails` : "Email metadata with AI classification (auto-refreshes every 15s)"}
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>

          {categories.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 w-full">
              <div className="w-full min-h-[200px]">
                {loading ? (
                  <div className="flex items-center justify-center py-16 w-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {emails.map((email) => (
                      <EmailSummary
                        key={email.id}
                        id={email.id}
                        sender={email.sender}
                        subject={email.subject}
                        snippet={email.snippet}
                        receivedAt={email.receivedAt}
                        classification={email.classification}
                        onClassificationChange={fetchEmails}
                      />
                    ))}
                    {emails.length === 0 && !loading && (
                      <div className="w-full rounded-lg border border-dashed border-muted-foreground/25 p-12 text-center text-muted-foreground bg-muted/30 space-y-2">
                        <p>
                          {filter
                            ? `No ${filter === "subscriptions_bills" ? "subscriptions or bills" : filter} emails found.`
                            : "No emails found. New emails sync automatically every 15 seconds."}
                        </p>
                        {filter && filter !== "all" && (
                          <p className="text-xs">
                            Use the dropdown on each email in All to set the correct category.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

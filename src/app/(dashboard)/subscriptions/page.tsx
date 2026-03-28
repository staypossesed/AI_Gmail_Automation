"use client";

import { useEffect, useState } from "react";
import { SubscriptionCard } from "@/components/subscription-card";
import { Loader2 } from "lucide-react";

interface Subscription {
  id: string;
  name: string;
  estimatedPrice: number | null;
  billingFrequency: string | null;
  lastBillingDate: string | null;
  sourceEmail?: { subject: string } | null;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((res) => res.ok ? res.json() : [])
      .then(setSubscriptions)
      .finally(() => setLoading(false));
  }, []);

  const total = subscriptions.reduce((s, sub) => s + (sub.estimatedPrice || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">
          Detected recurring billing from your emails
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {subscriptions.length > 0 && (
            <div className="rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-sm font-medium">
                {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""} totaling
                approximately ${total.toFixed(2)}/month
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                name={sub.name}
                estimatedPrice={sub.estimatedPrice}
                billingFrequency={sub.billingFrequency}
                lastBillingDate={sub.lastBillingDate}
                sourceSubject={sub.sourceEmail?.subject}
              />
            ))}
          </div>
          {subscriptions.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No subscriptions detected. Sync Gmail from the dashboard to analyze your emails.
            </div>
          )}
        </>
      )}
    </div>
  );
}

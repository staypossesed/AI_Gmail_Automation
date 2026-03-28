"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

interface SubscriptionCardProps {
  name: string;
  estimatedPrice?: number | null;
  billingFrequency?: string | null;
  lastBillingDate?: string | null;
  sourceSubject?: string | null;
}

export function SubscriptionCard({
  name,
  estimatedPrice,
  billingFrequency,
  lastBillingDate,
  sourceSubject,
}: SubscriptionCardProps) {
  const freqLabel =
    billingFrequency === "monthly"
      ? "/mo"
      : billingFrequency === "yearly"
        ? "/yr"
        : billingFrequency === "weekly"
          ? "/wk"
          : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{name}</h3>
          {sourceSubject && (
            <p className="text-xs text-muted-foreground truncate">{sourceSubject}</p>
          )}
        </div>
        {estimatedPrice != null && (
          <Badge variant="secondary" className="font-mono">
            ${estimatedPrice.toFixed(2)}
            {freqLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {lastBillingDate && (
          <p className="text-xs text-muted-foreground">
            Last billing: {new Date(lastBillingDate).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface InsightCardProps {
  text: string;
  createdAt?: string;
}

export function InsightCard({ text, createdAt }: InsightCardProps) {
  return (
    <Card className="border-l-4 border-l-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="flex gap-3 pt-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm leading-relaxed">{text}</p>
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

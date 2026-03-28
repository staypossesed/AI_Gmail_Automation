"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Loader2 } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  sourceEmail?: { subject: string } | null;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    const res = await fetch("/api/reminders");
    if (res.ok) {
      const data = await res.json();
      setReminders(data);
    }
    setLoading(false);
  };

  const markComplete = async (id: string) => {
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: true }),
    });
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed: true } : r)));
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        <p className="text-muted-foreground">
          Deadlines and appointments extracted from your emails
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <Card key={reminder.id} className={reminder.completed ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{reminder.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Due: {new Date(reminder.dueDate).toLocaleDateString()}
                    {new Date(reminder.dueDate) < new Date() && !reminder.completed && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </p>
                </div>
                {!reminder.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markComplete(reminder.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {reminders.length === 0 && !loading && (
            <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              No reminders yet. Sync Gmail from the dashboard to extract deadlines.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

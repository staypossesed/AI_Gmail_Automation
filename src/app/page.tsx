import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sparkles, Mail, Bell, CreditCard } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container flex flex-col items-center justify-center px-4 py-24">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-powered personal operations
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            AI Life Admin
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your AI chief-of-staff. Connect Gmail and get insights on subscriptions, bills,
            deadlines, and important messages—all in one place.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-6 text-base font-medium hover:bg-muted"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-8 sm:grid-cols-3 max-w-4xl">
          <div className="rounded-xl border bg-card p-6 text-center">
            <Mail className="mx-auto h-10 w-10 text-primary mb-3" />
            <h3 className="font-semibold">Gmail Integration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your inbox. We analyze metadata only—never store full email content.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-primary mb-3" />
            <h3 className="font-semibold">Subscription Detection</h3>
            <p className="text-sm text-muted-foreground mt-1">
              See all your recurring bills: Netflix, gym, software—with estimated costs.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <Bell className="mx-auto h-10 w-10 text-primary mb-3" />
            <h3 className="font-semibold">Smart Reminders</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Deadlines from bills, appointments, and travel—extracted automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

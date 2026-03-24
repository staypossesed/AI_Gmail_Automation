import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Force dynamic - enables keyless mode (Clerk works without env vars at runtime)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Life Admin",
  description: "AI-powered personal operations assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
            <div className="container flex h-14 items-center justify-between px-4">
              <a href="/" className="font-semibold">
                AI Life Admin
              </a>
              <nav className="flex items-center gap-2">
                <SignedOut>
                  <SignInButton mode="modal" />
                  <SignUpButton mode="modal" />
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </nav>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

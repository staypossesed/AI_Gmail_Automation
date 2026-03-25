"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 200;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastVisibleRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const shouldShow = window.scrollY > SCROLL_THRESHOLD;
      if (shouldShow !== lastVisibleRef.current) {
        lastVisibleRef.current = shouldShow;
        setVisible(shouldShow);
      }
    });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    lastVisibleRef.current = window.scrollY > SCROLL_THRESHOLD;
    setVisible(lastVisibleRef.current);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="flex h-14 w-full items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
      >
        <ArrowUp className="h-5 w-5" />
        <span className="text-sm font-medium">Back to top</span>
      </button>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MoreHorizontal, ChevronUp, Loader2, Pencil } from "lucide-react";

const classificationColors: Record<string, string> = {
  subscription: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  bill: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  appointment: "bg-green-500/10 text-green-700 dark:text-green-400",
  important: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  personal: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  spam: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  irrelevant: "bg-muted text-muted-foreground",
};

function decodeHtmlEntities(text: string): string {
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (el) {
    el.innerHTML = text;
    return el.value;
  }
  return text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

const SANITIZE_CONFIG = {
  ADD_ATTR: ["target"],
  ALLOWED_TAGS: ["a", "p", "br", "div", "span", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

const CATEGORIES = [
  { value: "appointment", label: "Appointment" },
  { value: "important", label: "Important" },
  { value: "personal", label: "Personal" },
  { value: "subscription", label: "Subscription" },
  { value: "bill", label: "Bill" },
  { value: "spam", label: "Spam" },
  { value: "irrelevant", label: "Other" },
] as const;

interface EmailSummaryProps {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  classification?: string | null;
  onClassificationChange?: () => void;
}

export function EmailSummary({
  id,
  sender,
  subject,
  snippet,
  receivedAt,
  classification,
  onClassificationChange,
}: EmailSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [localClassification, setLocalClassification] = useState<string | null>(null);

  useEffect(() => {
    setLocalClassification(null);
  }, [classification]);

  const displayClassification = localClassification ?? classification ?? "irrelevant";
  const colorClass = displayClassification
    ? classificationColors[displayClassification] || classificationColors.irrelevant
    : classificationColors.irrelevant;

  const handleCategoryChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCat = e.target.value;
      if (!newCat) return;
      setUpdating(true);
      try {
        const res = await fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classification: newCat }),
        });
        if (res.ok) {
          setLocalClassification(newCat);
          onClassificationChange?.();
        }
      } finally {
        setUpdating(false);
      }
    },
    [id, onClassificationChange]
  );

  const handleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (fullBody !== null || fullHtml !== null) {
      setExpanded(true);
      return;
    }
    setLoadingBody(true);
    try {
      const res = await fetch(`/api/emails/${id}/body`);
      const data = res.ok ? await res.json() : null;
      const plain = decodeHtmlEntities(data?.body ?? "");
      const rawHtml = data?.html ?? "";
      if (rawHtml) {
        const sanitized = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
        const safeLinks = sanitized.replace(
          /<a /gi,
          '<a target="_blank" rel="noopener noreferrer" '
        );
        setFullHtml(safeLinks);
        setFullBody(null);
      } else {
        setFullBody(plain);
        setFullHtml(null);
      }
      setExpanded(true);
    } catch {
      setFullBody("");
      setFullHtml(null);
      setExpanded(true);
    } finally {
      setLoadingBody(false);
    }
  }, [id, expanded, fullBody, fullHtml]);

  return (
    <Card>
      <CardContent className="flex gap-3 pt-4 pb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground truncate">{sender}</span>
            {editingCategory ? (
              <select
                value={displayClassification}
                onChange={(e) => {
                  handleCategoryChange(e);
                  setEditingCategory(false);
                }}
                onBlur={() => setEditingCategory(false)}
                disabled={updating}
                autoFocus
                className={`cursor-pointer rounded-md border px-2 py-0.5 text-xs font-medium focus:ring-2 focus:ring-ring ${colorClass}`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`group flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
                title="AI classified. Hover and click edit to change."
              >
                {CATEGORIES.find((c) => c.value === displayClassification)?.label ?? "Other"}
                <button
                  type="button"
                  onClick={() => setEditingCategory(true)}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity p-0.5 -m-0.5 rounded"
                  aria-label="Change category"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <h4 className="font-medium truncate">{subject}</h4>
          {!expanded ? (
            <p className={`text-sm text-muted-foreground line-clamp-2`}>
              {snippet || "No content"}
            </p>
          ) : fullHtml ? (
            <div
              className="text-sm text-muted-foreground break-words [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0 [&_a]:text-primary [&_a]:underline [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: fullHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {fullBody || "No content"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(receivedAt).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={handleExpand}
            disabled={loadingBody}
            aria-label={expanded ? "Show less" : "Read full email"}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-70"
          >
            {loadingBody ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <MoreHorizontal className="h-4 w-4" />
                Read more
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

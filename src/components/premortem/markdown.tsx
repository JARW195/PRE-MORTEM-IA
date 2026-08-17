"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Custom Markdown renderer tuned for PRE-MORTEM reports.
 * - Tables, headings, blockquotes, lists, emphasis all styled.
 * - Inline emphasis on verdict labels (ROBUSTO / VULNERABLE / etc.) colorized.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-2 mb-6 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    // Section headers like "## 🎯 1. OBJETIVO ANALIZADO"
    return (
      <h2 className="mt-8 mb-4 scroll-mt-24 border-b border-border/60 pb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2 scroll-mt-24 text-base font-semibold text-foreground sm:text-lg">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 text-sm leading-relaxed text-foreground/90 sm:text-[0.95rem]">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 text-sm text-foreground/90 sm:text-[0.95rem] marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 text-sm text-foreground/90 sm:text-[0.95rem] marker:text-muted-foreground marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  strong: ({ children }) => {
    const text = extractText(children);
    const label = text?.toUpperCase();
    let cls = "font-semibold text-foreground";
    if (label === "ROBUSTO") cls = "font-bold text-emerald-400";
    else if (label === "REQUIERE ATENCIÓN" || label === "REQUIERE ATENCION")
      cls = "font-bold text-amber-400";
    else if (label === "VULNERABLE") cls = "font-bold text-orange-400";
    else if (label === "ALTO RIESGO") cls = "font-bold text-red-400";
    else if (label === "HECHO") cls = "font-semibold text-emerald-400";
    else if (label === "SUPUESTO") cls = "font-semibold text-amber-400";
    else if (label === "INFERENCIA") cls = "font-semibold text-sky-300";
    else if (label === "CRÍTICO" || label === "CRITICO")
      cls = "font-bold text-red-400";
    else if (label === "IMPORTANTE") cls = "font-bold text-orange-400";
    else if (label === "MODERADO") cls = "font-semibold text-amber-300";
    else if (label === "BAJO") cls = "font-semibold text-emerald-400";
    return <strong className={cls}>{children}</strong>;
  },
  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-amber-500/60 bg-amber-500/5 py-3 pl-4 pr-3 text-sm italic text-foreground/80 [&_p]:my-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border/60" />,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-amber-400 underline decoration-amber-400/40 underline-offset-2 hover:decoration-amber-400"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-amber-300"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono", className)} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-xs">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-5 w-full overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full border-collapse text-left text-xs sm:text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border/60 px-3 py-2.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/40 px-3 py-2 align-top text-foreground/85">
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-muted/20 transition-colors hover:bg-muted/30">
      {children}
    </tr>
  ),
};

function extractText(node: React.ReactNode): string | null {
  if (node == null || node === false) return null;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join("");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return null;
}

export const Markdown = React.memo(function Markdown({
  content,
}: {
  content: string;
}) {
  // Memoize: the report string rarely changes for a given analysis, so avoid
  // re-parsing markdown on every parent re-render (performance #16).
  const parsed = React.useMemo(
    () => (
      <div className="break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    ),
    [content]
  );
  return parsed;
});

"use client";

import * as React from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CATEGORY_LABELS,
  getStandardsForType,
  type IsoCategory,
} from "@/lib/premortem/iso-standards";
import type { ProjectType } from "@/lib/premortem/types";
import { PROJECT_TYPE_LABELS } from "@/lib/premortem/types";
import { cn } from "@/lib/utils";

export function IsoStandardsPreview({
  projectType,
  disabled,
}: {
  projectType: ProjectType;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const standards = React.useMemo(
    () => getStandardsForType(projectType),
    [projectType]
  );

  // Group by category
  const grouped = React.useMemo(() => {
    const map = new Map<IsoCategory, typeof standards>();
    for (const s of standards) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries());
  }, [standards]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} disabled={disabled}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40",
          disabled && "opacity-50"
        )}
      >
        <span className="flex items-center gap-2 text-xs">
          <ShieldCheck className="size-3.5 text-amber-400" />
          <span className="font-medium text-foreground/80">
            {standards.length} norma{standards.length === 1 ? "" : "s"} ISO
            consideradas
          </span>
          <span className="text-muted-foreground">
            · {PROJECT_TYPE_LABELS[projectType]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 rounded-lg border border-border/40 bg-muted/10 p-3">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li key={s.id} className="text-xs">
                    <code className="font-mono text-[0.7rem] text-amber-300">
                      {s.id}
                    </code>
                    <span className="ml-1.5 text-foreground/70">
                      {s.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="pt-1 text-[0.65rem] italic text-muted-foreground/70">
            El análisis evaluará la conformidad real del proyecto con cada norma y
            declarará incertidumbre cuando falte información.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

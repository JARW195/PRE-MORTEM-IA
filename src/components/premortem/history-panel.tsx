"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Clock,
  FileText,
  ListChecks,
  Pencil,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  DEPTH_LABELS,
  HORIZON_LABELS,
  PROJECT_TYPE_LABELS,
  type PremortemResult,
} from "@/lib/premortem/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HistoryPanelProps {
  items: PremortemResult[];
  activeId: string | null;
  onSelect: (item: PremortemResult) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onEdit: (
    id: string,
    patch: { title?: string; tags?: string[]; notes?: string; archived?: boolean }
  ) => Promise<void>;
}

type SortKey = "recent" | "score-asc" | "score-desc" | "title";
type FilterVerdict = "all" | "ROBUSTO" | "REQUIERE ATENCION" | "VULNERABLE" | "ALTO RIESGO";

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score <= 39) return "text-red-400";
  if (score <= 59) return "text-orange-400";
  if (score <= 79) return "text-amber-300";
  return "text-emerald-400";
}

function verdictBadge(verdict: string | null) {
  if (!verdict) return null;
  const map: Record<string, string> = {
    ROBUSTO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    "REQUIERE ATENCION": "border-amber-500/40 bg-amber-500/10 text-amber-400",
    VULNERABLE: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    "ALTO RIESGO": "border-red-500/40 bg-red-500/10 text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
        map[verdict] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      {verdict.replace(/_/g, " ")}
    </span>
  );
}

/** Parse the tags field (JSON string) into a string array. */
function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onDelete,
  onClear,
  onEdit,
}: HistoryPanelProps) {
  const [query, setQuery] = React.useState("");
  const [filterVerdict, setFilterVerdict] = React.useState<FilterVerdict>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("recent");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editTags, setEditTags] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  // 05·HISTÓRICO — por defecto la "mesa de trabajo" solo muestra activos.
  const [showArchived, setShowArchived] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);

  const archivedCount = React.useMemo(
    () => items.filter((it) => (it as PremortemResult).archived).length,
    [items]
  );

  async function toggleArchived(item: PremortemResult, e: React.SyntheticEvent) {
    e.stopPropagation();
    setArchivingId(item.id);
    try {
      await onEdit(item.id, { archived: !item.archived });
    } finally {
      setArchivingId(null);
    }
  }

  // Filter + sort
  const filtered = React.useMemo(() => {
    let list = items;
    list = list.filter((it) => Boolean((it as PremortemResult).archived) === showArchived);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.projectType.toLowerCase().includes(q) ||
          (it as PremortemResult & { tags?: unknown }).tags
            ? parseTags((it as PremortemResult & { tags?: unknown }).tags).some((t) =>
                t.toLowerCase().includes(q)
              )
            : false
      );
    }
    if (filterVerdict !== "all") {
      list = list.filter((it) => it.verdict === filterVerdict);
    }
    const sorted = [...list];
    switch (sortKey) {
      case "score-desc":
        sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        break;
      case "score-asc":
        sorted.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
    return sorted;
  }, [items, query, filterVerdict, sortKey, showArchived]);

  function startEdit(item: PremortemResult) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditTags(parseTags((item as PremortemResult & { tags?: unknown }).tags).join(", "));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onEdit(id, { title: editTitle, tags });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <Clock className="size-6 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Aún no has ejecutado ningún pre-mortem.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Tus análisis aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {showArchived ? "Archivados" : "Historial"} ({filtered.length}
          {filtered.length !== items.length ? `/${items.length}` : ""})
        </span>
        <div className="flex items-center gap-1">
          {archivedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "h-7 gap-1 px-2 text-xs",
                showArchived
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={
                showArchived
                  ? "Volver a los análisis activos"
                  : `Ver ${archivedCount} archivado${archivedCount === 1 ? "" : "s"} (05·HISTÓRICO)`
              }
            >
              {showArchived ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
              {showArchived ? "Activos" : `Archivados (${archivedCount})`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="size-3" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-2 px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, tipo o etiqueta…"
            className="h-8 pl-8 pr-7 text-xs"
            aria-label="Buscar en historial"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={filterVerdict} onValueChange={(v) => setFilterVerdict(v as FilterVerdict)}>
            <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los veredictos</SelectItem>
              <SelectItem value="ROBUSTO">🟢 Robusto</SelectItem>
              <SelectItem value="REQUIERE ATENCION">🟡 Requiere atención</SelectItem>
              <SelectItem value="VULNERABLE">🟠 Vulnerable</SelectItem>
              <SelectItem value="ALTO RIESGO">🔴 Alto riesgo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger size="sm" className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="score-desc">Score ↓</SelectItem>
              <SelectItem value="score-asc">Score ↑</SelectItem>
              <SelectItem value="title">Título A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-h-[55vh] flex-1 space-y-1 overflow-y-auto px-2 pb-2 premortem-scroll">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Sin resultados para tu búsqueda.
            </p>
          ) : (
            filtered.map((item) => {
              const active = item.id === activeId;
              const tags = parseTags(
                (item as PremortemResult & { tags?: unknown }).tags
              );
              const isEditing = editingId === item.id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      "group w-full rounded-lg border px-3 py-2.5 transition-colors",
                      active
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-transparent hover:border-border/60 hover:bg-muted/40"
                    )}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-7 text-xs"
                          aria-label="Editar título"
                        />
                        <Input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="etiquetas, separadas, por coma"
                          className="h-7 text-xs"
                          aria-label="Editar etiquetas"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 flex-1 text-xs"
                            disabled={saving || !editTitle.trim()}
                            onClick={() => saveEdit(item.id)}
                          >
                            {saving ? "Guardando…" : "Guardar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="block w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate text-sm font-medium",
                                active ? "text-amber-300" : "text-foreground/90"
                              )}
                              title={item.title}
                            >
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                              {PROJECT_TYPE_LABELS[
                                item.projectType as keyof typeof PROJECT_TYPE_LABELS
                              ] ?? item.projectType}
                              {" · "}
                              {HORIZON_LABELS[
                                item.horizon as keyof typeof HORIZON_LABELS
                              ] ?? item.horizon}
                              {" · "}
                              {DEPTH_LABELS[item.depth as keyof typeof DEPTH_LABELS] ??
                                item.depth}
                            </p>
                            {tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {tags.map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[0.6rem] text-amber-400"
                                  >
                                    <Tag className="size-2" />
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {item.score != null && (
                              <span
                                className={cn(
                                  "font-mono text-sm font-bold tabular-nums",
                                  scoreColor(item.score)
                                )}
                              >
                                {item.score}
                              </span>
                            )}
                            {verdictBadge(item.verdict)}
                            {item.hasActionPlan && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[0.6rem] text-emerald-400"
                                title="Plan de Acción generado (ciclo: Ajustar)"
                              >
                                <ListChecks className="size-2.5" />
                                Plan ✓
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                            <FileText className="size-2.5" />
                            {new Date(item.createdAt).toLocaleString("es", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => toggleArchived(item, e)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleArchived(item, e);
                                }
                              }}
                              className={cn(
                                "text-muted-foreground hover:text-amber-400",
                                archivingId === item.id && "opacity-50"
                              )}
                              aria-label={showArchived ? "Desarchivar análisis" : "Archivar análisis"}
                              title={
                                showArchived
                                  ? "Volver a la mesa de trabajo"
                                  : "Archivar (05·HISTÓRICO)"
                              }
                            >
                              {showArchived ? (
                                <ArchiveRestore className="size-3.5" />
                              ) : (
                                <Archive className="size-3.5" />
                              )}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(item);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  startEdit(item);
                                }
                              }}
                              className="text-muted-foreground hover:text-amber-400"
                              aria-label="Editar análisis"
                            >
                              <Pencil className="size-3.5" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  onDelete(item.id);
                                }
                              }}
                              className="text-muted-foreground hover:text-red-400"
                              aria-label="Eliminar análisis"
                            >
                              <Trash2 className="size-3.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

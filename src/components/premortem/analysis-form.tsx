"use client";

import * as React from "react";
import { Bomb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEPTH_LABELS,
  HORIZON_LABELS,
  PROJECT_TYPE_LABELS,
  type Depth,
  type Horizon,
  type ProjectType,
} from "@/lib/premortem/types";
import { IsoStandardsPreview } from "./iso-standards-preview";
import { FileUpload, type UploadItem } from "./file-upload";
import { PROJECT_TEMPLATES } from "@/lib/premortem/project-templates";
import {
  Select as SelectUI,
  SelectContent as SelectContentUI,
  SelectItem as SelectItemUI,
  SelectTrigger as SelectTriggerUI,
  SelectValue as SelectValueUI,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface AnalysisFormProps {
  onRun: (input: {
    projectDescription: string;
    projectType: ProjectType;
    horizon: Horizon;
    depth: Depth;
    context: string;
    files?: UploadItem[];
  }) => void;
  loading: boolean;
}

const EXAMPLES: {
  label: string;
  text: string;
}[] = [
  {
    label: "SaaS de IA",
    text: "Quiero crear un SaaS de inteligencia artificial para pequeñas empresas que automatice la atención al cliente con chatbots. Cobraré una suscripción mensual de USD 29. Usaré la API de OpenAI. El MVP lo construyo yo solo en 3 meses con presupuesto de USD 5.000. Mi público objetivo son tiendas online de América Latina.",
  },
  {
    label: "Café de especialidad",
    text: "Voy a abrir un café de especialidad en un barrio céntrico. Inversión inicial USD 45.000 (préstamo bancario). Dos socios operativos más un barista contratado. Alquiler USD 1.500 mensuales. Esperamos 120 clientes al día con ticket promedio de USD 6. Horizonte de evaluación: 12 meses para recuperar la inversión.",
  },
  {
    label: "Migración a la nube",
    text: "Migrar el ERP interno de la empresa (200 usuarios, 8 años de desarrollo) desde servidores on-premise a AWS. Equipo interno de 3 desarrolladores sin experiencia previa en cloud. Presupuesto USD 30.000. Plazo 6 meses. Sin downtime tolerado durante la migración.",
  },
];

export function AnalysisForm({ onRun, loading }: AnalysisFormProps) {
  const [projectDescription, setProjectDescription] = React.useState("");
  const [projectType, setProjectType] = React.useState<ProjectType>("startup");
  const [horizon, setHorizon] = React.useState<Horizon>("12m");
  const [depth, setDepth] = React.useState<Depth>("estandar");
  const [context, setContext] = React.useState("");
  const [showContext, setShowContext] = React.useState(false);
  const [files, setFiles] = React.useState<UploadItem[]>([]);

  const hasFiles = files.length > 0;
  const minDesc = hasFiles ? 10 : 20;
  const canRun = projectDescription.trim().length >= minDesc && !loading;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRun) return;
    onRun({ projectDescription, projectType, horizon, depth, context, files });
  }

  const addFiles = React.useCallback((items: UploadItem[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.file.name + p.file.size));
      const fresh = items.filter((i) => !seen.has(i.file.name + i.file.size));
      return [...prev, ...fresh];
    });
  }, []);
  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const clearFiles = React.useCallback(() => setFiles([]), []);

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="project" className="text-sm font-medium">
            Describe el proyecto, idea o decisión a analizar
          </Label>
          <span
            className={
              projectDescription.trim().length >= minDesc
                ? "text-xs text-emerald-400"
                : "text-xs text-muted-foreground"
            }
          >
            {projectDescription.trim().length} / {minDesc} mín.
          </span>
        </div>
        <Textarea
          id="project"
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          placeholder="Ej: Quiero lanzar un SaaS de IA para automatizar facturación en pymes. Equipo de 2 personas, USD 15.000 de capital, uso de APIs de terceros, suscripción mensual de USD 39. ¿Qué tendría que ocurrir para que fracase?"
          className="min-h-[160px] resize-y font-mono text-sm leading-relaxed"
          disabled={loading}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ejemplos:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              disabled={loading}
              onClick={() => setProjectDescription(ex.text)}
              className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs text-foreground/70 transition-colors hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
          <SelectUI
            disabled={loading}
            onValueChange={(id) => {
              const tpl = PROJECT_TEMPLATES.find((t) => t.id === id);
              if (tpl) {
                setProjectDescription(tpl.description);
                setProjectType(tpl.projectType);
                setHorizon(tpl.horizon);
                setDepth(tpl.depth);
              }
            }}
            value=""
          >
            <SelectTriggerUI size="sm" className="h-6 gap-1 rounded-full border-amber-500/40 bg-amber-500/10 px-2.5 text-xs text-amber-400 hover:bg-amber-500/20">
              <Sparkles className="size-3" />
              <SelectValueUI placeholder="Plantillas" />
            </SelectTriggerUI>
            <SelectContentUI>
              {PROJECT_TEMPLATES.map((tpl) => (
                <SelectItemUI key={tpl.id} value={tpl.id}>
                  {tpl.label}
                </SelectItemUI>
              ))}
            </SelectContentUI>
          </SelectUI>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            Archivos del proyecto (opcional)
          </Label>
          <span className="text-xs text-muted-foreground">
            — el sistema extrae el contenido para analizarlo como evidencia
          </span>
        </div>
        <FileUpload
          items={files}
          onAdd={addFiles}
          onRemove={removeFile}
          onClear={clearFiles}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-xs text-muted-foreground">
            Tipo de proyecto
          </Label>
          <Select
            value={projectType}
            onValueChange={(v) => setProjectType(v as ProjectType)}
            disabled={loading}
          >
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="horizon" className="text-xs text-muted-foreground">
            Horizonte de fracaso
          </Label>
          <Select
            value={horizon}
            onValueChange={(v) => setHorizon(v as Horizon)}
            disabled={loading}
          >
            <SelectTrigger id="horizon" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HORIZON_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="depth" className="text-xs text-muted-foreground">
            Profundidad
          </Label>
          <Select
            value={depth}
            onValueChange={(v) => setDepth(v as Depth)}
            disabled={loading}
          >
            <SelectTrigger id="depth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DEPTH_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowContext((s) => !s)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showContext ? "− Ocultar" : "+ Agregar"} contexto adicional (opcional)
        </button>
        {showContext && (
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Información adicional que el analista debería considerar: recursos disponibles, equipo, presupuesto, restricciones, datos del mercado, etc."
            className="min-h-[80px] resize-y text-sm"
            disabled={loading}
          />
        )}
      </div>

      <IsoStandardsPreview projectType={projectType} disabled={loading} />

      <Button
        type="submit"
        disabled={!canRun}
        size="lg"
        className="w-full bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-red-700"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Analizando…
          </>
        ) : (
          <>
            <Bomb className="size-4" />
            Ejecutar Pre-Mortem
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        El análisis se guardará automáticamente en tu historial local.
      </p>
    </form>
  );
}

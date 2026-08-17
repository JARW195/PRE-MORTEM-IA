/**
 * i18n infrastructure for PRE-MORTEM IA.
 *
 * Spanish (es) is the canonical / default language; English (en) is the
 * secondary option. The dictionary covers the MAIN visible UI strings of the
 * app: header, hero, pipeline, form labels, history, report view, empty state,
 * loading state, team names, footer, plus verdict labels and score-band
 * classifications.
 *
 * Translation keys use a flat `namespace.subnamespace.key` convention so they
 * are greppable and stable across the codebase. The `t()` helper falls back to
 * the Spanish entry when an English key is missing, and finally returns the
 * raw key string itself so callers never get `undefined`.
 *
 * NOTE: this file is client-safe (no Node-only imports) so it can be imported
 * from both server and client components.
 */

export type Language = "es" | "en";

/* ------------------------------------------------------------------ */
/*  Main UI translations                                              */
/* ------------------------------------------------------------------ */

export const translations: Record<Language, Record<string, string>> = {
  es: {
    /* App header */
    "app.title": "PRE-MORTEM IA",
    "app.version": "v1",
    "app.subtitle": "Simulador de fracaso preventivo",
    "app.poweredBy": "Powered by LLM",

    /* Hero */
    "hero.badge": "Análisis adversarial preventivo",
    "hero.h1.pre": "Descubre cómo podría fracasar tu proyecto",
    "hero.h1.highlight": "antes de que sea tarde",
    "hero.description":
      "Un equipo virtual de 7 especialistas intenta destruir intelectualmente tu idea: busca supuestos débiles, omisiones, puntos únicos de falla y riesgos invisibles. No busca agradarte. Busca lo que tú no estás viendo.",

    /* Pipeline steps */
    "pipeline.1.label": "Comprender",
    "pipeline.1.desc": "Objetivo, problema, recursos y supuestos.",
    "pipeline.2.label": "Declarar el fracaso",
    "pipeline.2.desc": "Asumimos que el proyecto ya fracasó.",
    "pipeline.3.label": "Atacar",
    "pipeline.3.desc": "Equipo multidisciplinario busca causas.",
    "pipeline.4.label": "Priorizar",
    "pipeline.4.desc": "Matriz de riesgo con score 1–125.",
    "pipeline.5.label": "Defender",
    "pipeline.5.desc": "Plan concreto y ejecutable.",
    "pipeline.6.label": "Segundo ataque",
    "pipeline.6.desc": "Vulnerabilidades residuales.",

    /* Form */
    "form.card.title": "Proyecto a analizar",
    "form.description.label": "Describe el proyecto, idea o decisión a analizar",
    "form.description.counterMin": "mín.",
    "form.description.placeholder":
      "Ej: Quiero lanzar un SaaS de IA para automatizar facturación en pymes. Equipo de 2 personas, USD 15.000 de capital, uso de APIs de terceros, suscripción mensual de USD 39. ¿Qué tendría que ocurrir para que fracase?",
    "form.examples.label": "Ejemplos:",
    "form.upload.label": "Archivos del proyecto (opcional)",
    "form.upload.hint":
      "— el sistema extrae el contenido para analizarlo como evidencia",
    "form.upload.dropzone":
      "Arrastra archivos aquí o haz clic para seleccionar",
    "form.upload.acceptedHint":
      "Texto, código, PDF, DOCX, XLSX, CSV, ZIP, imágenes. Hasta 40 archivos / 80 MB.",
    "form.upload.folder": "Subir carpeta",
    "form.upload.clearAll": "Quitar todos",
    "form.upload.fileCount": "{count} archivos",
    "form.upload.fileCountOne": "{count} archivo",
    "form.projectType.label": "Tipo de proyecto",
    "form.horizon.label": "Horizonte de fracaso",
    "form.depth.label": "Profundidad",
    "form.context.show": "+ Agregar",
    "form.context.hide": "− Ocultar",
    "form.context.label": "contexto adicional (opcional)",
    "form.context.placeholder":
      "Información adicional que el analista debería considerar: recursos disponibles, equipo, presupuesto, restricciones, datos del mercado, etc.",
    "form.submit.run": "Ejecutar Pre-Mortem",
    "form.submit.analyzing": "Analizando…",
    "form.saveHint": "El análisis se guardará automáticamente en tu historial local.",

    /* ISO preview */
    "iso.preview.count": "{count} normas ISO consideradas",
    "iso.preview.countOne": "{count} norma ISO considerada",
    "iso.preview.disclaimer":
      "El análisis evaluará la conformidad real del proyecto con cada norma y declarará incertidumbre cuando falte información.",
    "iso.badge": "ISO-aware",

    /* History panel */
    "history.title": "Historial",
    "history.titleWithCount": "Historial ({count})",
    "history.clear": "Limpiar",
    "history.delete": "Eliminar análisis",
    "history.empty.title": "Aún no has ejecutado ningún pre-mortem.",
    "history.empty.subtitle": "Tus análisis aparecerán aquí.",
    "history.loading": "Cargando historial…",

    /* Report view */
    "report.error.title": "No se pudo generar el análisis",
    "report.error.retry": "Reintentar",
    "report.copy": "Copiar",
    "report.copied": "Copiado",
    "report.downloadMd": ".md",
    "report.pdf": "PDF",
    "report.viewPdf": "Ver PDF",
    "report.preparationIndex": "Índice de preparación",
    "report.preparationDesc":
      "Evaluación heurística de IA — no es una medición científica ni auditoría certificada. Refleja la preparación global estimada según los riesgos, omisiones y puntos únicos de falla detectados.",
    "report.generatedOn": "Análisis generado el {date}",

    /* Empty state (right column) */
    "empty.title": "Aún no hay análisis",
    "empty.body":
      "Describe tu proyecto a la izquierda y pulsa {action}. El equipo virtual asumirá que tu proyecto ya fracasó y buscará exactamente por qué.",
    "empty.bodyAction": "Ejecutar Pre-Mortem",
    "empty.whatYouGet": "¿Qué obtendrás?",
    "empty.badge.topRisks": "TOP 5 riesgos",
    "empty.badge.score": "Score 1–125",
    "empty.badge.invisibleRisk": "Riesgo invisible",
    "empty.badge.defensePlan": "Plan de defensa",
    "empty.badge.secondAttack": "Segundo ataque",
    "empty.badge.verdict": "Veredicto final",

    /* Virtual team reference */
    "team.title": "Equipo virtual",
    "team.estratega": "Estratega pesimista",
    "team.financiero": "Director financiero",
    "team.personas": "Experto en personas",
    "team.tecnologico": "Arquitecto tecnológico",
    "team.operaciones": "Director de operaciones",
    "team.compliance": "Compliance & reputación",
    "team.adversario": "Adversario estratégico",

    /* Loading state */
    "loading.title": "Pre-mortem en curso",
    "loading.description":
      "El equipo virtual está analizando tu proyecto. Esto puede tardar entre 30 y 90 segundos según la profundidad.",
    "loading.specialist.estratega.task":
      "buscando el peor escenario razonable",
    "loading.specialist.financiero.task":
      "rastreando costos ocultos y flujo de caja",
    "loading.specialist.personas.task":
      "identificando dependencias críticas",
    "loading.specialist.tecnologico.task":
      "revisando puntos únicos de falla",
    "loading.specialist.operaciones.task":
      "detectando cuellos de botella",
    "loading.specialist.compliance.task":
      "declarando incertidumbres",
    "loading.specialist.adversario.task":
      "intentando destruir la idea",
    "loading.phase.1": "Declarando el fracaso…",
    "loading.phase.2": "Ejecutando el ataque multidisciplinario…",
    "loading.phase.3": "Calculando scores de riesgo…",
    "loading.phase.4": "Priorizando el TOP 5…",
    "loading.phase.5": "Construyendo el plan de defensa…",
    "loading.phase.6": "Lanzando el segundo ataque…",
    "loading.phase.7": "Determinando el índice de preparación…",
    "loading.phase.8": "Redactando el veredicto final…",

    /* Score gauge classifications (0–100) */
    "score.0_39": "Altamente vulnerable",
    "score.40_59": "Vulnerable",
    "score.60_79": "Preparación moderada",
    "score.80_94": "Bien preparado",
    "score.95_100": "Altamente preparado",
    "score.gaugeAria": "Índice de preparación: {score} de 100. {label}",

    /* Footer */
    "footer.disclaimer":
      "PRE-MORTEM IA · Análisis heurístico de IA — no constituye auditoría profesional certificada ni garantía de éxito.",
    "footer.guidingPrinciple": "Principio rector:",
    "footer.principleQuote":
      "«descubre cómo perder antes de que sea demasiado tarde»",

    /* Toast / status messages */
    "toast.completed.title": "Pre-mortem completado",
    "toast.completed.description": "Índice de preparación: {score}/100",
    "toast.failed.title": "Falló el análisis",
    "toast.deleted.title": "Análisis eliminado",
    "toast.deleteFailed.title": "No se pudo eliminar",
    "toast.cleared.title": "Historial limpiado",
    "toast.clearFailed.title": "No se pudo limpiar el historial",
    "toast.error.title": "Error",

    /* Errors (from page.tsx handleRun) */
    "error.serverStatus":
      "El servidor respondió {status} {statusText}. Puede deberse a una caída temporal del servicio. Intenta nuevamente.",
    "error.unexpectedResponse":
      "El servidor devolvió una respuesta inesperada. Intenta nuevamente.",
    "error.noJobId": "El servidor no devolvió un identificador de trabajo.",
    "error.timeout":
      "El análisis tardó demasiado en completarse. El modelo puede estar saturado; intenta nuevamente en unos segundos.",
    "error.jobExpired":
      "El trabajo de análisis expiró o no se encontró. Intenta nuevamente.",
    "error.aborted":
      "La conexión con el servidor se interrumpió. Intenta nuevamente.",
    "error.network":
      "Error de conexión con el servidor. Verifica tu red e intenta nuevamente.",
    "error.unknown": "Error al ejecutar el análisis.",
    "error.loadAnalysis": "No se pudo cargar el análisis.",
    "error.loadAnalysisFallback": "Error al cargar el análisis.",

    /* Language / theme controls */
    "lang.label": "Idioma",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toggle": "Cambiar tema",
    "theme.toggleLight": "Cambiar a tema claro",
    "theme.toggleDark": "Cambiar a tema oscuro",
  },

  en: {
    /* App header */
    "app.title": "PRE-MORTEM IA",
    "app.version": "v1",
    "app.subtitle": "Preventive failure simulator",
    "app.poweredBy": "Powered by LLM",

    /* Hero */
    "hero.badge": "Preventive adversarial analysis",
    "hero.h1.pre": "Discover how your project could fail",
    "hero.h1.highlight": "before it's too late",
    "hero.description":
      "A virtual team of 7 specialists tries to intellectually destroy your idea: it looks for weak assumptions, omissions, single points of failure and invisible risks. It isn't here to please you. It's here to find what you're not seeing.",

    /* Pipeline steps */
    "pipeline.1.label": "Understand",
    "pipeline.1.desc": "Goal, problem, resources and assumptions.",
    "pipeline.2.label": "Declare failure",
    "pipeline.2.desc": "We assume the project has already failed.",
    "pipeline.3.label": "Attack",
    "pipeline.3.desc": "Multidisciplinary team looks for causes.",
    "pipeline.4.label": "Prioritize",
    "pipeline.4.desc": "Risk matrix with 1–125 score.",
    "pipeline.5.label": "Defend",
    "pipeline.5.desc": "Concrete, executable plan.",
    "pipeline.6.label": "Second attack",
    "pipeline.6.desc": "Residual vulnerabilities.",

    /* Form */
    "form.card.title": "Project to analyze",
    "form.description.label":
      "Describe the project, idea or decision to analyze",
    "form.description.counterMin": "min.",
    "form.description.placeholder":
      "E.g.: I want to launch an AI SaaS to automate invoicing for SMBs. Team of 2, USD 15,000 capital, third-party APIs, USD 39 monthly subscription. What would have to happen for it to fail?",
    "form.examples.label": "Examples:",
    "form.upload.label": "Project files (optional)",
    "form.upload.hint":
      "— the system extracts the content to analyze it as evidence",
    "form.upload.dropzone": "Drag files here or click to select",
    "form.upload.acceptedHint":
      "Text, code, PDF, DOCX, XLSX, CSV, ZIP, images. Up to 40 files / 80 MB.",
    "form.upload.folder": "Upload folder",
    "form.upload.clearAll": "Remove all",
    "form.upload.fileCount": "{count} files",
    "form.upload.fileCountOne": "{count} file",
    "form.projectType.label": "Project type",
    "form.horizon.label": "Failure horizon",
    "form.depth.label": "Depth",
    "form.context.show": "+ Add",
    "form.context.hide": "− Hide",
    "form.context.label": "additional context (optional)",
    "form.context.placeholder":
      "Additional information the analyst should consider: available resources, team, budget, constraints, market data, etc.",
    "form.submit.run": "Run Pre-Mortem",
    "form.submit.analyzing": "Analyzing…",
    "form.saveHint":
      "The analysis will be saved automatically to your local history.",

    /* ISO preview */
    "iso.preview.count": "{count} ISO standards considered",
    "iso.preview.countOne": "{count} ISO standard considered",
    "iso.preview.disclaimer":
      "The analysis will assess the project's actual conformance with each standard and declare uncertainty when information is missing.",
    "iso.badge": "ISO-aware",

    /* History panel */
    "history.title": "History",
    "history.titleWithCount": "History ({count})",
    "history.clear": "Clear",
    "history.delete": "Delete analysis",
    "history.empty.title": "You haven't run any pre-mortem yet.",
    "history.empty.subtitle": "Your analyses will appear here.",
    "history.loading": "Loading history…",

    /* Report view */
    "report.error.title": "The analysis could not be generated",
    "report.error.retry": "Retry",
    "report.copy": "Copy",
    "report.copied": "Copied",
    "report.downloadMd": ".md",
    "report.pdf": "PDF",
    "report.viewPdf": "View PDF",
    "report.preparationIndex": "Preparedness index",
    "report.preparationDesc":
      "Heuristic AI assessment — not a scientific measurement or certified audit. It reflects the estimated overall preparedness based on detected risks, omissions and single points of failure.",
    "report.generatedOn": "Analysis generated on {date}",

    /* Empty state (right column) */
    "empty.title": "No analysis yet",
    "empty.body":
      "Describe your project on the left and press {action}. The virtual team will assume your project has already failed and look for exactly why.",
    "empty.bodyAction": "Run Pre-Mortem",
    "empty.whatYouGet": "What you'll get:",
    "empty.badge.topRisks": "TOP 5 risks",
    "empty.badge.score": "Score 1–125",
    "empty.badge.invisibleRisk": "Invisible risk",
    "empty.badge.defensePlan": "Defense plan",
    "empty.badge.secondAttack": "Second attack",
    "empty.badge.verdict": "Final verdict",

    /* Virtual team reference */
    "team.title": "Virtual team",
    "team.estratega": "Pessimistic strategist",
    "team.financiero": "CFO",
    "team.personas": "People expert",
    "team.tecnologico": "Tech architect",
    "team.operaciones": "COO",
    "team.compliance": "Compliance & reputation",
    "team.adversario": "Strategic adversary",

    /* Loading state */
    "loading.title": "Pre-mortem in progress",
    "loading.description":
      "The virtual team is analyzing your project. This can take between 30 and 90 seconds depending on depth.",
    "loading.specialist.estratega.task": "looking for the worst reasonable scenario",
    "loading.specialist.financiero.task": "tracking hidden costs and cash flow",
    "loading.specialist.personas.task": "identifying critical dependencies",
    "loading.specialist.tecnologico.task": "reviewing single points of failure",
    "loading.specialist.operaciones.task": "detecting bottlenecks",
    "loading.specialist.compliance.task": "declaring uncertainties",
    "loading.specialist.adversario.task": "trying to destroy the idea",
    "loading.phase.1": "Declaring failure…",
    "loading.phase.2": "Running the multidisciplinary attack…",
    "loading.phase.3": "Calculating risk scores…",
    "loading.phase.4": "Prioritizing the TOP 5…",
    "loading.phase.5": "Building the defense plan…",
    "loading.phase.6": "Launching the second attack…",
    "loading.phase.7": "Determining the preparedness index…",
    "loading.phase.8": "Drafting the final verdict…",

    /* Score gauge classifications (0–100) */
    "score.0_39": "Highly vulnerable",
    "score.40_59": "Vulnerable",
    "score.60_79": "Moderate preparedness",
    "score.80_94": "Well prepared",
    "score.95_100": "Highly prepared",
    "score.gaugeAria": "Preparedness index: {score} of 100. {label}",

    /* Footer */
    "footer.disclaimer":
      "PRE-MORTEM IA · Heuristic AI analysis — not a certified professional audit or guarantee of success.",
    "footer.guidingPrinciple": "Guiding principle:",
    "footer.principleQuote":
      "«discover how to lose before it's too late»",

    /* Toast / status messages */
    "toast.completed.title": "Pre-mortem completed",
    "toast.completed.description": "Preparedness index: {score}/100",
    "toast.failed.title": "Analysis failed",
    "toast.deleted.title": "Analysis deleted",
    "toast.deleteFailed.title": "Could not delete",
    "toast.cleared.title": "History cleared",
    "toast.clearFailed.title": "Could not clear history",
    "toast.error.title": "Error",

    /* Errors (from page.tsx handleRun) */
    "error.serverStatus":
      "The server responded {status} {statusText}. The service may be temporarily down. Please try again.",
    "error.unexpectedResponse":
      "The server returned an unexpected response. Please try again.",
    "error.noJobId": "The server did not return a job identifier.",
    "error.timeout":
      "The analysis took too long to complete. The model may be saturated; please try again in a few seconds.",
    "error.jobExpired":
      "The analysis job expired or was not found. Please try again.",
    "error.aborted":
      "The connection to the server was interrupted. Please try again.",
    "error.network":
      "Connection error with the server. Check your network and try again.",
    "error.unknown": "Error running the analysis.",
    "error.loadAnalysis": "Could not load the analysis.",
    "error.loadAnalysisFallback": "Error loading the analysis.",

    /* Language / theme controls */
    "lang.label": "Language",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toggle": "Toggle theme",
    "theme.toggleLight": "Switch to light theme",
    "theme.toggleDark": "Switch to dark theme",
  },
};

/* ------------------------------------------------------------------ */
/*  Label maps (bilingual mirrors of the Spanish-only maps in types.ts) */
/* ------------------------------------------------------------------ */

export const PROJECT_TYPE_LABELS_I18N: Record<
  Language,
  Record<string, string>
> = {
  es: {
    saas: "Producto SaaS",
    startup: "Startup / Emprendimiento",
    internal_process: "Proceso interno",
    investment: "Inversión",
    software: "Proyecto de software",
    strategy: "Estrategia / Decisión",
    other: "Otro",
  },
  en: {
    saas: "SaaS product",
    startup: "Startup / Venture",
    internal_process: "Internal process",
    investment: "Investment",
    software: "Software project",
    strategy: "Strategy / Decision",
    other: "Other",
  },
};

export const HORIZON_LABELS_I18N: Record<Language, Record<string, string>> = {
  es: {
    "3m": "3 meses",
    "6m": "6 meses",
    "12m": "12 meses",
    "24m": "24 meses",
  },
  en: {
    "3m": "3 months",
    "6m": "6 months",
    "12m": "12 months",
    "24m": "24 months",
  },
};

export const DEPTH_LABELS_I18N: Record<Language, Record<string, string>> = {
  es: {
    rapido: "Rápido",
    estandar: "Estándar",
    profundo: "Profundo",
  },
  en: {
    rapido: "Quick",
    estandar: "Standard",
    profundo: "Deep",
  },
};

/**
 * Verdict labels with emoji glyph + localized word. Keys are the canonical
 * verdict strings emitted by the LLM (`ROBUSTO`, `REQUIERE ATENCION`,
 * `VULNERABLE`, `ALTO RIESGO`); callers should look up by the verdict stored
 * on the analysis (case-insensitive match is left to the caller).
 */
export const VERDICT_LABELS_I18N: Record<Language, Record<string, string>> = {
  es: {
    ROBUSTO: "🟢 ROBUSTO",
    "REQUIERE ATENCION": "🟡 REQUIERE ATENCIÓN",
    VULNERABLE: "🟠 VULNERABLE",
    "ALTO RIESGO": "🔴 ALTO RIESGO",
  },
  en: {
    ROBUSTO: "🟢 ROBUST",
    "REQUIERE ATENCION": "🟡 NEEDS ATTENTION",
    VULNERABLE: "🟠 VULNERABLE",
    "ALTO RIESGO": "🔴 HIGH RISK",
  },
};

/* ------------------------------------------------------------------ */
/*  Translator                                                        */
/* ------------------------------------------------------------------ */

/**
 * Translate a key for the given language.
 *
 * Lookup order:
 *  1. `translations[lang][key]`
 *  2. `translations["es"][key]`  (Spanish is the canonical fallback)
 *  3. the raw `key` itself (so callers never get `undefined`)
 *
 * Simple `{placeholder}` interpolation is supported when `params` is provided:
 * `t("en", "toast.completed.description", { score: 42 })` →
 * `"Preparedness index: 42/100"`.
 */
export function t(
  lang: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  const raw =
    translations[lang]?.[key] ?? translations.es[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

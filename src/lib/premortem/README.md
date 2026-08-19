# `src/lib/premortem/` — capa 01·INSTRUCCIONES

Esta carpeta es la capa **INSTRUCCIONES** del modelo de 5 carpetas ("Cómo
trabajar mejor con IA"): qué queremos que la IA haga y cuáles son las reglas.
Las otras 4 capas viven fuera de este directorio:

| Carpeta del modelo | Dónde vive en este proyecto |
|---|---|
| 01 · INSTRUCCIONES | **Este directorio** (`system-prompt.ts`, `action-plan-prompt.ts`) |
| 02 · ORIGINAL (no se modifica) | `Analysis.projectDescription` en Postgres — se guarda intacto |
| 03 · TRABAJO (en progreso) | Tabla `Job` + `job-store.ts` |
| 04 · RESULTADOS | `Analysis.report` / `.score` / `.verdict` / `.actionPlan` |
| 05 · HISTÓRICO | Limpieza automática de `Job` (TTL 30 min) + `Analysis.parentAnalysisId` para versionado |

## Qué hace cada archivo

| Archivo | Rol |
|---|---|
| `system-prompt.ts` | Prompt principal. Responde las 6 preguntas del "prompt base" (qué quiero / qué debe saber / qué debe hacer / qué no debe hacer / formato / criterio de revisión). Paso **EVALUAR + ORIENTAR** del ciclo. |
| `action-plan-prompt.ts` | Prompt de seguimiento (sección 14). Convierte el diagnóstico en un plan ejecutable. Paso **AJUSTAR** del ciclo. |
| `llm.ts` | Arma el mensaje de usuario (contexto mínimo — la "mesa de trabajo") y llama al modelo. Paso **ACCIONAR**. |
| `job-store.ts` | Persistencia del estado del trabajo en progreso (03·TRABAJO). |
| `file-extractor.ts` | Extrae texto de archivos subidos por el usuario (PDF/DOCX/XLSX) para inyectarlo como contexto. |
| `iso-standards.ts` | Catálogo de normas ISO aplicables por tipo de proyecto, usado por `system-prompt.ts`. |
| `risk-parser.ts` | Parsea el informe markdown para alimentar el dashboard visual de riesgos. |
| `report-html.ts` / `xlsx-export.ts` | Exportación del informe a PDF/Excel. |
| `project-templates.ts` | Plantillas de ejemplo para el formulario de entrada. |
| `i18n.ts` | Etiquetas en español/inglés. |
| `types.ts` | Tipos compartidos entre backend y frontend. |
| `format.ts` | Utilidades de formato sin dependencias de servidor (seguro para el cliente). |

## Regla al agregar un prompt nuevo

Si agregas un prompt nuevo a esta carpeta, documenta en su header:
1. Qué pregunta del "prompt base" responde cada sección.
2. En qué paso del ciclo Evaluar→Orientar→Accionar→Ajustar encaja.
3. Qué contexto mínimo necesita (evita mandar más de lo necesario — mantén
   la "mesa de trabajo" despejada).

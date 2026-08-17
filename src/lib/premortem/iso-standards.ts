// ISO standards reference for PRE-MORTEM IA.
//
// All standard numbers and titles are publicly known reference identifiers.
// Scope summaries and challenge questions are original paraphrases written for
// this pre-mortem tool — they do not reproduce any standard's copyrighted text.
//
// Standards are grouped by domain and mapped to project types so the analysis
// is ISO-aware and adapts to the project being evaluated.

import type { ProjectType } from "./types";

export type IsoCategory =
  | "seguridad"
  | "calidad"
  | "riesgo"
  | "continuidad"
  | "privacidad"
  | "nube"
  | "software"
  | "ambiente"
  | "salud"
  | "gobernanza"
  | "innovacion"
  | "servicios"
  | "social";

export interface IsoStandard {
  id: string;
  category: IsoCategory;
  title: string;
  scope: string;
  challenge: string;
}

export const CATEGORY_LABELS: Record<IsoCategory, string> = {
  seguridad: "Seguridad de la información",
  calidad: "Gestión de calidad",
  riesgo: "Gestión de riesgos",
  continuidad: "Continuidad de negocio",
  privacidad: "Privacidad y protección de datos",
  nube: "Servicios en la nube",
  software: "Ingeniería de software",
  ambiente: "Gestión ambiental",
  salud: "Salud y seguridad ocupacional",
  gobernanza: "Gobernanza y ética",
  innovacion: "Innovación",
  servicios: "Servicios TI",
  social: "Responsabilidad social",
};

// Common standards applicable to almost every project.
const COMMON: IsoStandard[] = [
  {
    id: "ISO 31000:2018",
    category: "riesgo",
    title: "Gestión del riesgo — Directrices",
    scope:
      "Marco para diseñar, implementar y mejorar la gestión de riesgos: identificación, análisis, evaluación y tratamiento.",
    challenge:
      "¿Existe un proceso formal de gestión de riesgos con registro, propietario y revisión periódica, o los riesgos se gestionan de forma implícita y reactiva?",
  },
  {
    id: "ISO 22301:2019",
    category: "continuidad",
    title: "Seguridad y resiliencia — Sistemas de gestión de continuidad del negocio",
    scope:
      "Requisitos para planificar, establecer, implementar y mantener un sistema que asegure la continuidad operacional tras disrupciones.",
    challenge:
      "Si el proyecto sufre una disrupción crítica hoy, ¿hay un plan de continuidad probado, RTO/RPO definidos y respaldos verificables, o la recuperación sería improvisada?",
  },
];

const SECURITY_CORE: IsoStandard[] = [
  {
    id: "ISO/IEC 27001:2022",
    category: "seguridad",
    title: "Sistemas de gestión de la seguridad de la información (SGSI)",
    scope:
      "Requisitos para establecer, implementar, mantener y mejorar un SGSI; incluye Anexo A con 93 controles organizados en 4 temas.",
    challenge:
      "¿Existe un SGSI formal con declaración de aplicabilidad, análisis de riesgos de seguridad y política de control de accesos, o la seguridad depende de prácticas ad-hoc y configuraciones por defecto?",
  },
  {
    id: "ISO/IEC 27002:2022",
    category: "seguridad",
    title: "Código de buenas prácticas para controles de seguridad",
    scope:
      "Directrices y medidas de implementación para los controles del Anexo A de 27001: organizativos, de personas, físicos y tecnológicos.",
    challenge:
      "¿Los controles de seguridad están seleccionados según riesgo real o se aplican de forma genérica sin medir su efectividad?",
  },
];

const CLOUD_EXTRA: IsoStandard[] = [
  {
    id: "ISO/IEC 27017:2015",
    category: "nube",
    title: "Código de prácticas para controles de seguridad basados en la nube",
    scope:
      "Controles adicionales específicos de proveedores y clientes de servicios en la nube, complementarios a 27002.",
    challenge:
      "¿Están claras las responsabilidades compartidas de seguridad entre el proveedor cloud y el proyecto, y están documentadas en el contrato?",
  },
  {
    id: "ISO/IEC 27018:2019",
    category: "privacidad",
    title: "Protección de PII en la nube pública",
    scope:
      "Código de prácticas para que los proveedores de nube pública protejan información personal identificable (PII).",
    challenge:
      "Si procesas datos personales en la nube, ¿el proveedor cumple 27018 y existen cláusulas de protección de datos y localización de la información?",
  },
  {
    id: "ISO/IEC 27031:2011",
    category: "continuidad",
    title: "Preparación de las TIC para la continuidad del negocio",
    scope:
      "Directrices para que los servicios de TI soporten la continuidad del negocio cuando ocurre un incidente.",
    challenge:
      "¿La continuidad tecnológica está alineada con la continuidad del negocio, o existe un desfase entre RTO de negocio y la capacidad real de recuperación de TI?",
  },
];

const PRIVACY_EXTRA: IsoStandard[] = [
  {
    id: "ISO/IEC 27701:2019",
    category: "privacidad",
    title: "Sistema de gestión de la privacidad (SGP)",
    scope:
      "Extensión de 27001/27002 para la gestión de la privacidad; trata a la organización como responsable y encargado del tratamiento de PII.",
    challenge:
      "¿Existe un inventario de tratamientos de datos personales, base legal documentada para cada uno y evaluación de impacto a la privacidad?",
  },
  {
    id: "ISO/IEC 29134:2017",
    category: "privacidad",
    title: "Directrices para evaluaciones de impacto en la privacidad (PIA)",
    scope:
      "Requisitos para realizar evaluaciones de impacto en la privacidad de tratamientos de datos personales.",
    challenge:
      "¿Se ha realizado un PIA para tratamientos de alto riesgo (perfiles, datos sensibles, transferencias internacionales)?",
  },
];

const QUALITY_EXTRA: IsoStandard[] = [
  {
    id: "ISO 9001:2015",
    category: "calidad",
    title: "Sistemas de gestión de la calidad — Requisitos",
    scope:
      "Requisitos para un SGC basado en procesos, enfoque al cliente, mejora continua y pensamiento basado en riesgos.",
    challenge:
      "¿Los procesos críticos están documentados, medidos y mejorados, o dependen del conocimiento tácito de personas clave?",
  },
];

const SOFTWARE_EXTRA: IsoStandard[] = [
  {
    id: "ISO/IEC 25010:2011",
    category: "software",
    title: "Modelo de calidad del software (SQuaRE)",
    scope:
      "Características de calidad del producto software: funcionalidad, fiabilidad, rendimiento, usabilidad, seguridad, compatibilidad, mantenibilidad y portabilidad.",
    challenge:
      "¿Se han definido y medido requisitos explícitos de calidad (fiabilidad, seguridad, rendimiento) o la calidad se asume implícita?",
  },
  {
    id: "ISO/IEC 27034-1:2011",
    category: "software",
    title: "Seguridad de aplicaciones — Conceptos y procesos",
    scope:
      "Marco para integrar seguridad en el ciclo de vida del desarrollo de aplicaciones (AppSec).",
    challenge:
      "¿La seguridad se integra desde el diseño (shift-left) o se añade solo al final mediante pruebas?",
  },
  {
    id: "ISO/IEC 12207:2017",
    category: "software",
    title: "Ciclo de vida del software",
    scope:
      "Procesos y actividades del ciclo de vida del software, desde la concepción hasta el retiro.",
    challenge:
      "¿Existe un ciclo de vida definido con control de versiones, revisiones y gestión de cambios, o los cambios se aplican sin gobernanza?",
  },
  {
    id: "ISO/IEC 20000-1:2018",
    category: "servicios",
    title: "Gestión de servicios de TI",
    scope:
      "Requisitos para establecer, implementar y mejorar un sistema de gestión de servicios de TI (ITSM).",
    challenge:
      "¿Hay gestión formal de incidentes, problemas, cambios y niveles de servicio, o el soporte es reactivo sin SLA medible?",
  },
];

const ENVIRONMENT_EXTRA: IsoStandard[] = [
  {
    id: "ISO 14001:2015",
    category: "ambiente",
    title: "Sistemas de gestión ambiental",
    scope:
      "Requisitos para un SGA que permita mejorar el desempeño ambiental, cumplir obligaciones y lograr objetivos.",
    challenge:
      "¿Se identifican los aspectos e impactos ambientales del proyecto y se cumple la normativa ambiental aplicable?",
  },
];

const HEALTH_EXTRA: IsoStandard[] = [
  {
    id: "ISO 45001:2018",
    category: "salud",
    title: "Salud y seguridad en el trabajo (SST)",
    scope:
      "Requisitos para prevenir lesiones y enfermedades laborales, eliminar peligros y minimizar riesgos SST.",
    challenge:
      "¿Existen evaluaciones de riesgos laborales, EPP, capacitación y registro de incidentes, o la SST se gestiona solo tras un accidente?",
  },
];

const GOVERNANCE_EXTRA: IsoStandard[] = [
  {
    id: "ISO 37001:2016",
    category: "gobernanza",
    title: "Sistemas de gestión antisoborno",
    scope:
      "Requisitos para prevenir, detectar y tratar el soborno; medidas razonables y proporcionadas.",
    challenge:
      "¿Existen controles antisoborno, evaluación de riesgos de corrupción y canales de denuncia, especialmente si hay interacción con el sector público o proveedores?",
  },
  {
    id: "ISO 26000:2010",
    category: "social",
    title: "Responsabilidad social",
    scope:
      "Directrices sobre responsabilidad social: gobernanza, derechos humanos, prácticas laborales, medio ambiente, consumidor y comunidad.",
    challenge:
      "¿El proyecto considera su impacto social y reputacional más allá del cumplimiento legal mínimo?",
  },
  {
    id: "ISO 30414:2018",
    category: "gobernanza",
    title: "Reporte de capital humano",
    scope:
      "Métricas para reportar y medir el capital humano: diversidad, liderazgo, retención, productividad.",
    challenge:
      "¿Se mide la dependencia de personas clave y el riesgo de fuga de talento crítico para el proyecto?",
  },
];

const INNOVATION_EXTRA: IsoStandard[] = [
  {
    id: "ISO 56002:2019",
    category: "innovacion",
    title: "Sistemas de gestión de la innovación",
    scope:
      "Directrices para un sistema de gestión que permita a una organización establecer, implementar y mantener su capacidad de innovación.",
    challenge:
      "¿La innovación es gestionada con proceso, recursos y métricas, o depende de la inspiración ocasional del fundador?",
  },
];

const INVESTMENT_EXTRA: IsoStandard[] = [
  {
    id: "ISO 32210:2022",
    category: "gobernanza",
    title: "Finanzas sostenibles — Directrices",
    scope:
      "Principios y prácticas para integrar consideraciones de sostenibilidad en las actividades financieras (ESG).",
    challenge:
      "¿La decisión de inversión incorpora criterios ESG y de sostenibilidad, o se evalúa solo el retorno financiero a corto plazo?",
  },
];

const STRATEGY_EXTRA: IsoStandard[] = [
  {
    id: "ISO 37000:2021",
    category: "gobernanza",
    title: "Gobernanza de las organizaciones — Directrices",
    scope:
      "Directrices para la gobernanza: propósito, valor, rendición de cuentas, transparencia y toma de decisiones.",
    challenge:
      "¿La decisión tiene un órgano/rol con autoridad y rendición de cuentas claras, o la gobernanza queda difusa?",
  },
];

const PROCESS_EXTRA: IsoStandard[] = [
  {
    id: "ISO 30401:2016",
    category: "gobernanza",
    title: "Sistemas de gestión del conocimiento",
    scope:
      "Requisitos para gestionar el conocimiento organizacional como activo: creación, captura, intercambio y retención.",
    challenge:
      "¿El conocimiento crítico está documentado y transferible, o vive solo en la cabeza de unas pocas personas?",
  },
];

function dedupe(list: IsoStandard[]): IsoStandard[] {
  const seen = new Set<string>();
  const out: IsoStandard[] = [];
  for (const s of list) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      out.push(s);
    }
  }
  return out;
}

export const ISO_STANDARDS_BY_TYPE: Record<ProjectType, IsoStandard[]> = {
  saas: dedupe([
    ...SECURITY_CORE,
    ...CLOUD_EXTRA,
    ...PRIVACY_EXTRA,
    ...SOFTWARE_EXTRA,
    ...QUALITY_EXTRA,
    ...COMMON,
  ]),
  startup: dedupe([
    ...QUALITY_EXTRA,
    ...INNOVATION_EXTRA,
    ...GOVERNANCE_EXTRA,
    ...COMMON,
    ...SECURITY_CORE,
  ]),
  internal_process: dedupe([
    ...QUALITY_EXTRA,
    ...ENVIRONMENT_EXTRA,
    ...HEALTH_EXTRA,
    ...PROCESS_EXTRA,
    ...COMMON,
  ]),
  investment: dedupe([
    ...INVESTMENT_EXTRA,
    ...GOVERNANCE_EXTRA,
    ...COMMON,
    ...ENVIRONMENT_EXTRA,
  ]),
  software: dedupe([
    ...SOFTWARE_EXTRA,
    ...SECURITY_CORE,
    ...QUALITY_EXTRA,
    ...COMMON,
  ]),
  strategy: dedupe([
    ...STRATEGY_EXTRA,
    ...GOVERNANCE_EXTRA,
    ...INNOVATION_EXTRA,
    ...COMMON,
  ]),
  other: dedupe([
    ...COMMON,
    ...QUALITY_EXTRA,
    ...SECURITY_CORE,
    ...ENVIRONMENT_EXTRA,
    ...HEALTH_EXTRA,
    ...GOVERNANCE_EXTRA,
  ]),
};

export function getStandardsForType(type: ProjectType): IsoStandard[] {
  return ISO_STANDARDS_BY_TYPE[type] ?? COMMON;
}

/**
 * Common legal/regulatory regimes the pre-mortem should consider. These vary
 * by jurisdiction and sector; the AI must declare uncertainty when the project
 * geography is unclear rather than inventing obligations.
 */
export const LEGAL_FRAMES_PROMPT = `# MARCO JURÍDICO APLICABLE

Además de las normas ISO, el EXPERTO EN CUMPLIMIENTO Y REPUTACIÓN debe identificar los regímenes jurídicos potencialmente aplicables según la jurisdicción y el sector del proyecto, y DECLARAR INCERTIDUMBRE cuando la información sea insuficiente. No inventes obligaciones legales específicas; identifica los marcos relevantes y señala qué falta por confirmar. Considera al menos:

- Protección de datos personales (ej.: RGPD/UE 2016/679; LGPD Brasil; Ley 21.719 Chile; Ley Federal 24-LFP México; Ley 25.326 Argentina; CCPA/CPRA California). Solo señala el aplicable según la jurisdicción descrita.
- Protección al consumidor y comercio electrónico.
- Propiedad intelectual e industrial (marcas, patentes, derechos de autor, software).
- Protección laboral y subcontratación.
- Régimen tributario y fiscal aplicable.
- Sectorial: salud (ej. HIPAA si aplica en EE. UU.), financiero (PCI-DSS, SARBANES-OXLEY, Basel), telecomunicaciones, alimentos.
- Contratos y transferencia internacional de datos (cláusulas contractuales tipo).
- Régimen de firma electrónica y conservación de evidencia.

Cuando el proyecto opere en una jurisdicción no declarada, marca el ítem como "🔴 Crítica — jurisdicción no confirmada".`;

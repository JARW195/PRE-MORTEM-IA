// Project templates by industry (#6).
// Pre-filled project descriptions to help users start faster.

import type { ProjectType } from "./types";

export interface ProjectTemplate {
  id: string;
  label: string;
  projectType: ProjectType;
  horizon: "3m" | "6m" | "12m" | "24m";
  depth: "rapido" | "estandar" | "profundo";
  description: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "restaurante",
    label: "Restaurante / Café",
    projectType: "internal_process",
    horizon: "12m",
    depth: "estandar",
    description:
      "Quiero abrir un restaurante de comida de autor en zona céntrica. Inversión inicial USD 60.000 (préstamo bancario al 18%). Dos socios operativos + 4 empleados. Alquiler USD 2.000 mensuales. Espero 80 cubiertos/día con ticket promedio USD 18. Margen objetivo 30%. Horizonte: 18 meses para alcanzar punto de equilibrio.",
  },
  {
    id: "saas-b2b",
    label: "SaaS B2B",
    projectType: "saas",
    horizon: "12m",
    depth: "profundo",
    description:
      "Quiero lanzar un SaaS B2B de automatización de facturación para pymes en LATAM. Suscripción USD 49/mes. Uso APIs de OpenAI + proveedor de facturación electrónica local. Equipo de 3 (1 dev fullstack, 1 designer, 1 sales). Capital USD 80.000 para 12 meses. Objetivo: 200 clientes pagando al mes 12.",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    projectType: "startup",
    horizon: "6m",
    depth: "estandar",
    description:
      "Tienda online de productos artesanales con envíos a todo el país. Stack: Shopify + Stripe + proveedor logístico. Inversión USD 12.000 (capital propio). Inventario inicial USD 5.000. Marketing USD 1.500/mes. Ticket promedio USD 45. Meta: 150 ventas/mes al mes 6.",
  },
  {
    id: "fintech",
    label: "Fintech / Pagos",
    projectType: "saas",
    horizon: "12m",
    depth: "profundo",
    description:
      "Plataforma de pagos P2P para mercados emergentes. Procesamos pagos con tarjeta y billeteras móviles. Requisitos regulatorios PCI-DSS. Equipo técnico de 5 personas. Capital inicial USD 250.000 (semilla). Necesitamos licencia de emisor de dinero electrónico. Horizonte: 12 meses para MVP regulatorio + 5000 usuarios.",
  },
  {
    id: "salud",
    label: "Salud / Telemedicina",
    projectType: "saas",
    horizon: "12m",
    depth: "profundo",
    description:
      "Plataforma de telemedicina que conecta pacientes con médicos. Cumple HIPAA y normativa local de datos de salud. Equipo de 4. Capital USD 150.000. Integración con sistemas de agendas clínicas. Modelo: USD 29/mes por médico + comisión por consulta. Meta: 200 médicos activos al mes 9.",
  },
  {
    id: "migracion-cloud",
    label: "Migración a la nube",
    projectType: "software",
    horizon: "6m",
    depth: "estandar",
    description:
      "Migrar el ERP interno (300 usuarios, 10 años de desarrollo) desde servidores on-premise a AWS. Equipo interno de 4 desarrolladores sin experiencia previa en cloud. Presupuesto USD 40.000. Plazo 6 meses. Cero downtime tolerado durante la migración. Requisito: cumplir ISO 27001.",
  },
  {
    id: "inversion-real-estate",
    label: "Inversión inmobiliaria",
    projectType: "investment",
    horizon: "24m",
    depth: "estandar",
    description:
      "Comprar un departamento de inversión de USD 120.000 con 30% de pie (USD 36.000) y crédito hipotecario al 5,5% anual a 20 años. Arriendo esperado USD 600/mes. Gastos comunes USD 80/mensuales + seguros + mantención. Plusvalía histórica zona: 4% anual. Horizonte de evaluación: 24 meses.",
  },
  {
    id: "agencia-servicios",
    label: "Agencia de servicios",
    projectType: "startup",
    horizon: "12m",
    depth: "estandar",
    description:
      "Agencia de marketing digital con 3 fundadores. Servicios: SEO, ads, content. Capital USD 20.000. Modelo: proyectos de USD 3.000-8.000 + retainers USD 1.500/mes. Meta: 6 clientes retainer al mes 9. Dependencia alta de los fundadores (ventas + entrega).",
  },
];

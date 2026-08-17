"use client";

/**
 * LanguageProvider + useLanguage hook for PRE-MORTEM IA.
 *
 * Wraps the app with a React context that exposes the active language (es/en),
 * a setter that persists to localStorage, a `t(key)` translator bound to the
 * current language, and pre-built label maps for project types, horizons,
 * depths and verdicts.
 *
 * Usage (the main agent wires this in `layout.tsx` or `page.tsx`):
 *
 * ```tsx
 * <LanguageProvider>
 *   <App />
 * </LanguageProvider>
 *
 * // inside any child:
 * const { lang, setLang, t, labels } = useLanguage();
 * t("hero.h1.pre");                       // "Descubre cómo podría fracasar tu proyecto"
 * labels.projectTypes[projectType];        // "Producto SaaS" / "SaaS product"
 * labels.verdicts[result.verdict];         // "🟠 VULNERABLE" / "🟠 VULNERABLE"
 * setLang("en");
 * ```
 */

import * as React from "react";
import {
  DEPTH_LABELS_I18N,
  HORIZON_LABELS_I18N,
  PROJECT_TYPE_LABELS_I18N,
  VERDICT_LABELS_I18N,
  t as translate,
  type Language,
} from "@/lib/premortem/i18n";

const STORAGE_KEY = "premortem-lang";
const DEFAULT_LANG: Language = "es";

type LabelMap = Record<string, string>;

export interface LanguageLabels {
  projectTypes: LabelMap;
  horizons: LabelMap;
  depths: LabelMap;
  verdicts: LabelMap;
}

export interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Translate a key for the current language (with optional {placeholder} params). */
  t: (key: string, params?: Record<string, string | number>) => string;
  labels: LanguageLabels;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function isLanguage(value: unknown): value is Language {
  return value === "es" || value === "en";
}

function readStoredLang(): Language {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    /* localStorage unavailable (private mode, sandboxed iframe, etc.) */
  }
  return DEFAULT_LANG;
}

function writeStoredLang(lang: Language) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore write failures */
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always render the default language on the server and on the first client
  // paint to avoid hydration mismatches; sync from localStorage in an effect.
  const [lang, setLangState] = React.useState<Language>(DEFAULT_LANG);

  React.useEffect(() => {
    const stored = readStoredLang();
    if (stored !== DEFAULT_LANG) {
      setLangState(stored);
    }
  }, []);

  const setLang = React.useCallback((next: Language) => {
    setLangState(next);
    writeStoredLang(next);
  }, []);

  const value = React.useMemo<LanguageContextValue>(() => {
    const t = (key: string, params?: Record<string, string | number>) =>
      translate(lang, key, params);
    return {
      lang,
      setLang,
      t,
      labels: {
        projectTypes: PROJECT_TYPE_LABELS_I18N[lang],
        horizons: HORIZON_LABELS_I18N[lang],
        depths: DEPTH_LABELS_I18N[lang],
        verdicts: VERDICT_LABELS_I18N[lang],
      },
    };
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error(
      "useLanguage must be used within a <LanguageProvider>. Wrap the app (or the page) with <LanguageProvider>."
    );
  }
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from '@/i18n/en.json';

/** The 13 languages offered in the picker. Code = file name in src/i18n; dir only matters for Urdu. */
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'od', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
] as const;
export type LangCode = (typeof LANGUAGES)[number]['code'];
type Dict = Record<string, string>;

const KEY = 'prosperr.lang';
const loaders = import.meta.glob<{ default: Dict }>('../i18n/*.json');

/** The language picker was removed: the app is English only. Clear any earlier pick so nobody is stuck in another language. */
function saved(): LangCode {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  return 'en';
}

interface Ctx { lang: LangCode; setLang: (l: LangCode) => void; dict: Dict }
const I18nContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, dict: en as Dict });

/** Loads only the chosen language's file; anything missing falls back to English, so a screen never shows a key. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(saved);
  const [dict, setDict] = useState<Dict>(en as Dict);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === 'en') { setDict(en as Dict); return; }
    let cancelled = false;
    loaders[`../i18n/${lang}.json`]?.().then((m) => { if (!cancelled) setDict({ ...(en as Dict), ...m.default }); })
      .catch(() => { if (!cancelled) setDict(en as Dict); });
    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  }, []);

  const value = useMemo(() => ({ lang, setLang, dict }), [lang, setLang, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLanguage() { const { lang, setLang } = useContext(I18nContext); return { lang, setLang }; }

/** t('myday.toCall', { n: 4 }) -> "4 to call". Unknown keys return the fallback, then the key. */
export function useT() {
  const { dict } = useContext(I18nContext);
  return useCallback((key: string, vars?: Record<string, string | number>, fallback?: string) => {
    let s = dict[key] ?? (en as Dict)[key] ?? fallback ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [dict]);
}
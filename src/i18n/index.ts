import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import { storage } from '../storage/mmkvStorage';

// English — each namespace file exports { [ns]: {...}, ... }
import { common, settings, dashboard, family, finance, ops, ai, health, auth, onboarding } from './locales/en';

// Non-English — each _core.ts exports { common:{}, settings:{}, family:{}, ... }
// Imported synchronously so language switching is instant with no async race.
import frCore from './locales/fr/_core';
import esCore from './locales/es/_core';
import arCore from './locales/ar/_core';
import deCore from './locales/de/_core';
import itCore from './locales/it/_core';
import ptCore from './locales/pt/_core';
import jaCore from './locales/ja/_core';
import koCore from './locales/ko/_core';
import zhCore from './locales/zh/_core';

const SUPPORTED = ['en', 'fr', 'es', 'ar', 'zh', 'pt', 'de', 'it', 'ja', 'ko'];
const NS = ['common', 'settings', 'dashboard', 'family', 'finance', 'ops', 'ai', 'health', 'auth', 'onboarding'] as const;

// For non-English locales, _core.ts has structure { common:{}, settings:{}, family:{}, ... }.
// English namespace files also use the same top-level keys (e.g. settings.ts exports { settings:{} }).
// We register the full _core object for EVERY namespace so key paths like
// t('settings.language') → resources[lang]['settings']['settings']['language'] resolve correctly.
function nsMap(core: Record<string, any>): Record<string, Record<string, any>> {
  return Object.fromEntries(NS.map((ns) => [ns, core]));
}

function getInitialLanguage(): string {
  // 1. User-persisted preference
  try {
    const raw = storage.getString('family-command-center-app');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { settings?: { language?: string } } };
      const lang = parsed?.state?.settings?.language;
      if (lang && SUPPORTED.includes(lang)) return lang;
    }
  } catch {}
  // 2. Device locale via built-in RN APIs (no native-module linking needed)
  try {
    let deviceLang: string | undefined;
    if (Platform.OS === 'ios') {
      const preferred: string[] =
        NativeModules.SettingsManager?.settings?.AppleLanguages ??
        NativeModules.SettingsManager?.settings?.AppleLocale?.split('_') ??
        [];
      deviceLang = preferred[0]?.split('-')[0];
    } else {
      deviceLang = NativeModules.I18nManager?.localeIdentifier?.split('_')[0];
    }
    if (deviceLang && SUPPORTED.includes(deviceLang)) return deviceLang;
  } catch {}
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common, settings, dashboard, family, finance, ops, ai, health, auth, onboarding },
    fr: nsMap(frCore),
    es: nsMap(esCore),
    ar: nsMap(arCore),
    de: nsMap(deCore),
    it: nsMap(itCore),
    pt: nsMap(ptCore),
    ja: nsMap(jaCore),
    ko: nsMap(koCore),
    zh: nsMap(zhCore),
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  ns: NS,
  defaultNS: 'common',
  // Every non-English language registers its single _core.ts object for ALL
  // namespaces (see nsMap above), so a key like `common.cancel` resolves no
  // matter which namespace a screen is scoped to. English is split into
  // separate per-namespace files for maintainability, which breaks that
  // same cross-namespace resolution unless we explicitly fall back to
  // 'common' — screens everywhere call shared keys like t('common.cancel')
  // while scoped to their own namespace (e.g. 'family', 'ops'), so this
  // fallback is required for parity with how every other language behaves.
  fallbackNS: 'common',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
export { i18n };

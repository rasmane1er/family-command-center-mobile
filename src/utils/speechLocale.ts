import i18n from '../i18n';

// App language → BCP-47 tag understood by the OS speech engines. Used for both
// dictation (useVoiceInput) and spoken replies (services/speech.ts), so voice
// follows the language the family chose in Settings instead of being stuck on English.
const BCP47: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar-SA',
  zh: 'zh-CN',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export function getSpeechLocale(): string {
  const lang = (i18n.language ?? 'en').split('-')[0];
  return BCP47[lang] ?? 'en-US';
}

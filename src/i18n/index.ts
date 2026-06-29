import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';
import es from './locales/es';
import ar from './locales/ar';
import zh from './locales/zh';
import pt from './locales/pt';
import de from './locales/de';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    ar: { translation: ar },
    zh: { translation: zh },
    pt: { translation: pt },
    de: { translation: de },
    it: { translation: it },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
export { i18n };

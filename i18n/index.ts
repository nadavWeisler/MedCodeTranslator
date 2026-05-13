import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    he: { translation: he },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    ar: { translation: ar },
    pt: { translation: pt },
    zh: { translation: zh },
    ru: { translation: ru },
  },
  interpolation: { escapeValue: false },
});

export default i18n;

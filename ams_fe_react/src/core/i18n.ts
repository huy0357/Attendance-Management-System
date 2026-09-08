import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import viTranslations from '../locales/vi.json';

// Retrieve initial language from localStorage Settings
const getInitialLanguage = (): string => {
  try {
    const raw = localStorage.getItem('ams.settings.preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.language === 'en') return 'en';
      if (parsed.language === 'vi') return 'vi';
    }
  } catch (error) {
    // Ignore parse errors
  }
  return 'vi';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      vi: {
        translation: viTranslations,
      },
    },
    lng: getInitialLanguage(), // Default language: Vietnamese
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
  });

export default i18n;

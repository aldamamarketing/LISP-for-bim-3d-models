import { translations } from './translations';

export function getLangFromUrl(url) {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang;
  return 'en';
}

export function useTranslations(lang) {
  return function t(key) {
    const dict = translations[lang] || translations['en'];
    return dict[key] || key;
  }
}

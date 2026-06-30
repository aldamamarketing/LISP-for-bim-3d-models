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

export function localizeUrl(path, lang) {
  if (lang === 'en' || !lang) {
    return path;
  }
  // Remove leading slash if exists to avoid double slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${cleanPath}`;
}

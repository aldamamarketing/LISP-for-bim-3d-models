import { useState, useEffect } from 'react';
import { translations } from './translations';

export function getLang() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lispcentral_lang') || 'en';
  }
  return 'en';
}

export function setLang(lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lispcentral_lang', lang);
    window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
  }
}

export function useTranslation() {
  const [lang, setLangState] = useState(getLang());

  useEffect(() => {
    const handleLangChange = (e) => {
      setLangState(e.detail || getLang());
    };
    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, []);

  const t = (key) => {
    const dict = translations[lang] || translations['en'];
    return dict[key] || key;
  };

  return { t, lang, setLang };
}

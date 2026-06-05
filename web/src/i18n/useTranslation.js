import { useState, useEffect } from 'react';
import { translations } from './translations';

export function useTranslation() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/es/')) {
      setLang('es');
    } else if (path.startsWith('/pt/')) {
      setLang('pt');
    } else {
      const stored = localStorage.getItem('lc-lang');
      setLang(stored || 'en');
    }
  }, []);

  const t = (key) => {
    const dict = translations[lang] || translations['en'];
    return dict[key] || key;
  };

  return { t, lang };
}

import { useState, useEffect, useCallback } from 'react';
import { i18nService } from '@/services/i18n.service';

export function useI18n() {
  const [currentLanguage, setCurrentLanguage] = useState(i18nService.getCurrentLanguage());
  
  // Funktion zum Übersetzen von Texten
  const t = useCallback((key: string, params?: Record<string, string>) => {
    return i18nService.translate(key, params);
  }, [currentLanguage]);
  
  // Funktion zum Ändern der Sprache
  const changeLanguage = useCallback((language: string) => {
    i18nService.setLanguage(language);
    setCurrentLanguage(i18nService.getCurrentLanguage());
  }, []);
  
  // Verfügbare Sprachen abrufen
  const availableLanguages = i18nService.getAvailableLanguages();
  
  return {
    t,
    changeLanguage,
    currentLanguage,
    availableLanguages
  };
} 
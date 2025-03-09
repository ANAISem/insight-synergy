import React, { createContext, useContext, ReactNode } from 'react';
import { useI18n } from '@/hooks/use-i18n';

type I18nContextType = ReturnType<typeof useI18n>;

const defaultContext: I18nContextType = {
  t: (key) => key,
  changeLanguage: () => {},
  currentLanguage: 'de',
  availableLanguages: ['de', 'en']
};

const I18nContext = createContext<I18nContextType>(defaultContext);

export const useI18nContext = () => useContext(I18nContext);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const i18nValues = useI18n();
  
  return (
    <I18nContext.Provider value={i18nValues}>
      {children}
    </I18nContext.Provider>
  );
} 
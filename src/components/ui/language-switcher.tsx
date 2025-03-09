import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/hooks/use-i18n';
import { GlobeIcon } from '@/components/icons';

/**
 * Sprachauswahl-Komponente
 * Ermöglicht das Umschalten zwischen verschiedenen Sprachen
 */
export function LanguageSwitcher() {
  const { t, changeLanguage, currentLanguage, availableLanguages } = useI18n();

  // Sprachnamen für die Anzeige
  const languageNames: Record<string, string> = {
    de: 'Deutsch',
    en: 'English'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0" aria-label="Sprache ändern">
          <GlobeIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map(lang => (
          <DropdownMenuItem
            key={lang}
            onClick={() => changeLanguage(lang)}
            className={currentLanguage === lang ? 'bg-muted' : ''}
          >
            {languageNames[lang] || lang}
            {currentLanguage === lang && (
              <svg className="ml-2 h-2 w-2 fill-current" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
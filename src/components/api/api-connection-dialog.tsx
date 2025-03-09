import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiKeySetup } from './api-key-setup';
import { apiManager } from '@/services/api-manager.service';
import { useI18n } from '@/hooks/use-i18n';

export function ApiConnectionDialog() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Prüfe API-Status beim Laden
    const checkApiStatus = async () => {
      const status = apiManager.getStatus();
      
      // Öffne Dialog, wenn keine Verbindung besteht
      if (!status.isConnected) {
        setIsOpen(true);
      }
    };
    
    checkApiStatus();
  }, []);
  
  const handleSuccess = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('api.keys.setup')}</DialogTitle>
          <DialogDescription>
            {t('api.keys.description')}
          </DialogDescription>
        </DialogHeader>
        
        <ApiKeySetup onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
} 
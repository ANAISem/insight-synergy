import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Key,
  ExternalLink,
  Check,
  XCircle,
  AlertCircle
} from '@/components/icons';
import { apiManager } from '@/services/api-manager.service';
import { useI18n } from '@/hooks/use-i18n';

interface ApiKeySetupProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ApiKeySetup({ onClose, onSuccess }: ApiKeySetupProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    perplexity: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    openai: 'untested' | 'success' | 'error';
    perplexity: 'untested' | 'success' | 'error';
    message?: string;
  }>({
    openai: 'untested',
    perplexity: 'untested'
  });
  
  const isAnyKeySet = apiKeys.openai.trim() !== '' || apiKeys.perplexity.trim() !== '';
  const allKeysValid = testResults.openai === 'success' && testResults.perplexity === 'success';
  const anyKeyValid = testResults.openai === 'success' || testResults.perplexity === 'success';
  
  // API-Schlüssel aus localStorage laden, falls vorhanden
  useEffect(() => {
    const storedOpenAiKey = localStorage.getItem('openai_api_key');
    const storedPerplexityKey = localStorage.getItem('perplexity_api_key');
    
    if (storedOpenAiKey || storedPerplexityKey) {
      setApiKeys({
        openai: storedOpenAiKey || '',
        perplexity: storedPerplexityKey || ''
      });
    }
  }, []);
  
  // API-Schlüssel testen
  const testApiKeys = async () => {
    setTesting(true);
    setTestResults({
      openai: 'untested',
      perplexity: 'untested'
    });
    
    try {
      // Aktualisiere API-Schlüssel im API-Manager
      await apiManager.updateApiKeys(apiKeys);
      
      // Teste OpenAI API-Schlüssel
      if (apiKeys.openai.trim()) {
        try {
          await apiManager.callOpenAI('models', {});
          setTestResults(prev => ({ ...prev, openai: 'success' }));
        } catch (error) {
          console.error('OpenAI API-Test fehlgeschlagen:', error);
          setTestResults(prev => ({ 
            ...prev, 
            openai: 'error',
            message: error instanceof Error ? error.message : String(error)
          }));
        }
      }
      
      // Teste Perplexity API-Schlüssel
      if (apiKeys.perplexity.trim()) {
        try {
          await apiManager.callPerplexity('models', {});
          setTestResults(prev => ({ ...prev, perplexity: 'success' }));
        } catch (error) {
          console.error('Perplexity API-Test fehlgeschlagen:', error);
          setTestResults(prev => ({ 
            ...prev, 
            perplexity: 'error',
            message: error instanceof Error ? error.message : String(error)
          }));
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('api.keys.test_error'),
        description: String(error)
      });
    } finally {
      setTesting(false);
    }
  };
  
  // API-Schlüssel speichern
  const saveApiKeys = () => {
    // In localStorage speichern
    if (apiKeys.openai.trim()) {
      localStorage.setItem('openai_api_key', apiKeys.openai);
    }
    
    if (apiKeys.perplexity.trim()) {
      localStorage.setItem('perplexity_api_key', apiKeys.perplexity);
    }
    
    // Im API-Manager aktualisieren
    apiManager.updateApiKeys(apiKeys);
    
    toast({
      title: t('api.keys.saved'),
      description: t('api.keys.connection_ready')
    });
    
    if (onSuccess) {
      onSuccess();
    }
  };
  
  // Status-Icon basierend auf Test-Ergebnis
  const renderStatusIcon = (status: 'untested' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t('api.keys.setup')}
        </CardTitle>
        <CardDescription>{t('api.keys.description')}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* OpenAI API-Schlüssel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="openai-api-key" 
              className="flex items-center gap-2"
            >
              <span>OpenAI API {t('api.keys.key')}</span>
              {apiKeys.openai && renderStatusIcon(testResults.openai)}
            </Label>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <span>{t('api.keys.get')}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Input
            id="openai-api-key"
            type="password"
            placeholder="sk-..."
            value={apiKeys.openai}
            onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
          />
          {testResults.openai === 'error' && (
            <p className="text-xs text-red-500 mt-1">
              {t('api.keys.invalid')}
            </p>
          )}
        </div>
        
        {/* Perplexity API-Schlüssel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="perplexity-api-key" 
              className="flex items-center gap-2"
            >
              <span>Perplexity API {t('api.keys.key')}</span>
              {apiKeys.perplexity && renderStatusIcon(testResults.perplexity)}
            </Label>
            <a 
              href="https://docs.perplexity.ai/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <span>{t('api.keys.get')}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Input
            id="perplexity-api-key"
            type="password"
            placeholder="pplx-..."
            value={apiKeys.perplexity}
            onChange={(e) => setApiKeys(prev => ({ ...prev, perplexity: e.target.value }))}
          />
          {testResults.perplexity === 'error' && (
            <p className="text-xs text-red-500 mt-1">
              {t('api.keys.invalid')}
            </p>
          )}
        </div>
        
        {/* Hinweise */}
        <Alert>
          <AlertTitle>{t('api.keys.note')}</AlertTitle>
          <AlertDescription>
            <p>{t('api.keys.secure')}</p>
            <p className="mt-2">{t('api.keys.need_one')}</p>
          </AlertDescription>
        </Alert>
        
        {/* Fehlermeldung */}
        {testResults.message && (testResults.openai === 'error' || testResults.perplexity === 'error') && (
          <Alert variant="destructive">
            <AlertTitle>{t('api.keys.error')}</AlertTitle>
            <AlertDescription>
              {testResults.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={testApiKeys}
          disabled={testing || !isAnyKeySet}
        >
          {testing ? t('api.keys.testing') : t('api.keys.test')}
        </Button>
        
        <div className="space-x-2">
          {onClose && (
            <Button 
              variant="ghost" 
              onClick={onClose}
            >
              {t('api.keys.cancel')}
            </Button>
          )}
          
          <Button 
            variant="default" 
            onClick={saveApiKeys}
            disabled={testing || !isAnyKeySet || (!anyKeyValid && isAnyKeySet)}
          >
            {t('api.keys.save')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 
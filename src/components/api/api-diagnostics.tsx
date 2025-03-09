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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  Server,
  Globe,
  Shield,
  RefreshCw
} from '@/components/icons';
import { apiManager } from '@/services/api-manager.service';
import { useI18n } from '@/hooks/use-i18n';

interface ApiDiagnosticsProps {
  onClose?: () => void;
  onConfigureEndpoint?: (endpointUrl: string) => void;
}

export function ApiDiagnostics({ onClose, onConfigureEndpoint }: ApiDiagnosticsProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisComplete, setDiagnosisComplete] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState<{
    networkConnected: boolean;
    firewallIssue: boolean;
    dnsIssue: boolean;
    serverIssue: boolean;
    endpointDetails: Array<{
      name: string;
      status: 'available' | 'unavailable' | 'unknown';
      responseTime?: number;
      error?: string;
      statusCode?: number;
    }>;
    recommendations: string[];
  } | null>(null);

  // Diagnose starten
  const startDiagnosis = async () => {
    setIsLoading(true);
    setDiagnosisComplete(false);
    
    try {
      const results = await apiManager.diagnoseConnectionIssues();
      setDiagnosisResults(results);
      setDiagnosisComplete(true);
    } catch (error) {
      console.error('Fehler bei der API-Diagnose:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manuelle Verbindung zu einem Endpunkt herstellen
  const connectToEndpoint = (url: string) => {
    if (onConfigureEndpoint) {
      onConfigureEndpoint(url);
    }
  };

  // Status-Badge für Endpunkte
  const renderStatusBadge = (status: 'available' | 'unavailable' | 'unknown') => {
    switch (status) {
      case 'available':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('api.connect.available')}
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {t('api.connect.unavailable')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('api.connect.unknown')}
          </Badge>
        );
    }
  };

  // Icon basierend auf dem Problem-Typ
  const renderProblemIcon = (
    type: 'network' | 'dns' | 'firewall' | 'server' | 'api' | 'unknown'
  ) => {
    switch (type) {
      case 'network':
        return <Wifi className="h-5 w-5 text-amber-500" />;
      case 'dns':
        return <Globe className="h-5 w-5 text-amber-500" />;
      case 'firewall':
        return <Shield className="h-5 w-5 text-amber-500" />;
      case 'server':
        return <Server className="h-5 w-5 text-amber-500" />;
      case 'api':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  // Automatischer Start der Diagnose
  useEffect(() => {
    startDiagnosis();
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{t('api.diagnosis.title')}</CardTitle>
        <CardDescription>{t('api.diagnosis.description')}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Lade-Indikator während Diagnose */}
        {isLoading && (
          <div className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('api.diagnosis.running')}</span>
              <span className="text-sm">{Math.floor(Math.random() * 100)}%</span>
            </div>
            <Progress value={Math.floor(Math.random() * 100)} className="h-2" />
          </div>
        )}
        
        {/* Ergebnisse der Diagnose */}
        {diagnosisComplete && diagnosisResults && (
          <div className="space-y-6">
            {/* Netzwerkstatus */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('api.diagnosis.network_status')}</h3>
              <div className="flex items-center gap-2">
                {diagnosisResults.networkConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span>
                  {diagnosisResults.networkConnected 
                    ? t('api.diagnosis.network_connected')
                    : t('api.diagnosis.network_disconnected')}
                </span>
              </div>
            </div>
            
            {/* Endpunkt-Details */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('api.diagnosis.endpoints')}</h3>
              <div className="space-y-2">
                {diagnosisResults.endpointDetails.map((endpoint, index) => (
                  <div 
                    key={index}
                    className="flex flex-col p-3 border rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{endpoint.name}</span>
                      {renderStatusBadge(endpoint.status)}
                    </div>
                    
                    {endpoint.error && (
                      <div className="mt-2 text-sm text-red-500">
                        {endpoint.error}
                      </div>
                    )}
                    
                    {endpoint.responseTime !== undefined && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t('api.diagnosis.response_time')}: {endpoint.responseTime}ms
                      </div>
                    )}
                    
                    {endpoint.status === 'unavailable' && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => connectToEndpoint(endpoint.name)}
                        >
                          {t('api.connect.try_endpoint')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Erkannte Probleme */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">{t('api.diagnosis.issues')}</h3>
              <div className="grid gap-2">
                {!diagnosisResults.networkConnected && (
                  <Alert variant="destructive">
                    <div className="flex items-center gap-2">
                      {renderProblemIcon('network')}
                      <div>
                        <AlertTitle>{t('api.diagnosis.issue_network')}</AlertTitle>
                        <AlertDescription>
                          {t('api.diagnosis.issue_network_desc')}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {diagnosisResults.dnsIssue && (
                  <Alert variant="destructive">
                    <div className="flex items-center gap-2">
                      {renderProblemIcon('dns')}
                      <div>
                        <AlertTitle>{t('api.diagnosis.issue_dns')}</AlertTitle>
                        <AlertDescription>
                          {t('api.diagnosis.issue_dns_desc')}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {diagnosisResults.firewallIssue && (
                  <Alert variant="destructive">
                    <div className="flex items-center gap-2">
                      {renderProblemIcon('firewall')}
                      <div>
                        <AlertTitle>{t('api.diagnosis.issue_firewall')}</AlertTitle>
                        <AlertDescription>
                          {t('api.diagnosis.issue_firewall_desc')}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {diagnosisResults.serverIssue && (
                  <Alert variant="destructive">
                    <div className="flex items-center gap-2">
                      {renderProblemIcon('server')}
                      <div>
                        <AlertTitle>{t('api.diagnosis.issue_server')}</AlertTitle>
                        <AlertDescription>
                          {t('api.diagnosis.issue_server_desc')}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                {diagnosisResults.networkConnected && 
                  !diagnosisResults.dnsIssue && 
                  !diagnosisResults.firewallIssue && 
                  !diagnosisResults.serverIssue && 
                  diagnosisResults.endpointDetails.every(e => e.status === 'unavailable') && (
                  <Alert variant="destructive">
                    <div className="flex items-center gap-2">
                      {renderProblemIcon('api')}
                      <div>
                        <AlertTitle>{t('api.diagnosis.issue_api')}</AlertTitle>
                        <AlertDescription>
                          {t('api.diagnosis.issue_api_desc')}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            </div>
            
            {/* Empfehlungen */}
            {diagnosisResults.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t('api.diagnosis.recommendations')}</h3>
                <Alert>
                  <ul className="list-disc list-inside space-y-1">
                    {diagnosisResults.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </Alert>
              </div>
            )}
          </div>
        )}
        
        {/* Manueller API-Endpunkt */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-medium mb-2">{t('api.connect.add_custom')}</h3>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="https://api.example.com"
              className="flex-1 px-3 py-2 border rounded-md"
              id="custom-endpoint"
            />
            <Button
              onClick={() => {
                const input = document.getElementById('custom-endpoint') as HTMLInputElement;
                if (input && input.value) {
                  apiManager.addEndpoint({
                    url: input.value,
                    name: 'Custom Endpoint',
                    priority: 0
                  });
                  startDiagnosis();
                }
              }}
            >
              {t('api.connect.add')}
            </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => startDiagnosis()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('api.diagnosis.rerun')}
        </Button>
        
        {onClose && (
          <Button variant="default" onClick={onClose}>
            {t('api.diagnosis.close')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 
'use client';

import React, { useEffect, useState } from 'react';
import { insightCoreApi, ApiStatus } from '@/lib/insight-core/api-client';

export default function ApiStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Automatische Statusabfrage beim Laden der Komponente
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const apiStatus = await insightCoreApi.getApiStatus();
        setStatus(apiStatus);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Abrufen des API-Status:', err);
        setError('API nicht erreichbar');
      } finally {
        setLoading(false);
      }
    };
    
    // Status sofort abrufen
    fetchStatus();
    
    // Status alle 60 Sekunden aktualisieren
    const intervalId = setInterval(fetchStatus, 60000);
    
    // Aufräumen beim Unmounting
    return () => clearInterval(intervalId);
  }, []);
  
  // Status-Badge-Farben
  const getBadgeColor = (isAvailable: boolean) => {
    return isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };
  
  // Status-Anzeige
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
        <span>Prüfe API-Status...</span>
      </div>
    );
  }
  
  if (error || !status) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>API nicht verfügbar</span>
      </div>
    );
  }
  
  // Ist mindestens ein Modell verfügbar?
  const isAnyModelAvailable = 
    status.primary_model_available || 
    status.fallback_model_available || 
    status.is_core_available;
  
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2 text-sm">
        <div className={`w-3 h-3 rounded-full ${status.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="font-medium">
          API Status: {status.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {/* Detaillierte Statusanzeige (aufklappbar) */}
      <details className="text-xs text-gray-600 dark:text-gray-400">
        <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
          Details anzeigen
        </summary>
        <div className="mt-2 space-y-1 pl-5">
          <div className="flex space-x-2">
            <span className="font-medium">Modelle:</span>
            <div className="flex flex-col space-y-1">
              <span className={getBadgeColor(status.primary_model_available) + ' px-2 py-0.5 rounded-full inline-flex items-center'}>
                <span className={`w-2 h-2 rounded-full ${status.primary_model_available ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
                {status.models.primary}
              </span>
              <span className={getBadgeColor(status.fallback_model_available) + ' px-2 py-0.5 rounded-full inline-flex items-center'}>
                <span className={`w-2 h-2 rounded-full ${status.fallback_model_available ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
                {status.models.fallback}
              </span>
              {status.models.is_core && (
                <span className={getBadgeColor(status.is_core_available) + ' px-2 py-0.5 rounded-full inline-flex items-center'}>
                  <span className={`w-2 h-2 rounded-full ${status.is_core_available ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
                  {status.models.is_core}
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="font-medium">Perplexity:</span>
            <span className={getBadgeColor(status.perplexity_available) + ' ml-2 px-2 py-0.5 rounded-full text-xs'}>
              {status.perplexity_available ? 'Verfügbar' : 'Nicht verfügbar'}
            </span>
          </div>
          <div>
            <span className="font-medium">Version:</span> {status.version}
          </div>
          <div>
            <span className="font-medium">Letzte Aktualisierung:</span>{' '}
            {new Date(status.timestamp).toLocaleString()}
          </div>
        </div>
      </details>
    </div>
  );
} 
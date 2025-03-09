'use client';

import React, { useState } from 'react';
import { insightCoreApi } from '@/lib/insight-core/api-client';
import Markdown from 'react-markdown';

interface SolutionGeneratorProps {
  onSolutionGenerated?: (solution: any) => void;
}

export default function SolutionGenerator({ onSolutionGenerated }: SolutionGeneratorProps) {
  // Formularzustand
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [goals, setGoals] = useState('');
  
  // UI-Zustand
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<any | null>(null);
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Bitte gib eine Frage oder ein Problem ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Goals in ein Array umwandeln (ein Ziel pro Zeile)
      const goalsArray = goals
        .split('\n')
        .map(goal => goal.trim())
        .filter(goal => goal.length > 0);
      
      // API-Anfrage
      const response = await insightCoreApi.generateSolution({
        query,
        context: context || undefined,
        goals: goalsArray.length > 0 ? goalsArray : undefined,
      });
      
      // Lösung speichern
      setSolution(response);
      
      // Event auslösen
      if (onSolutionGenerated) {
        onSolutionGenerated(response);
      }
      
      // Optional: Lösung automatisch in der Datenbank speichern
      try {
        await insightCoreApi.saveSession({
          title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
          content: {
            query,
            context,
            goals: goalsArray,
            solution: response
          },
          model_used: response.model_used,
          tokens_used: response.token_count
        });
      } catch (saveError) {
        console.error('Fehler beim Speichern der Sitzung:', saveError);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
      console.error('Fehler bei der Lösungsgenerierung:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Lösungsgenerator</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hauptfrage */}
          <div>
            <label htmlFor="query" className="block text-sm font-medium mb-1">
              Deine Frage oder dein Problem
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Beschreibe deine Frage oder dein Problem..."
              required
            />
          </div>
          
          {/* Kontext (optional) */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium mb-1">
              Kontext (optional)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Zusätzliche Informationen, die helfen können..."
            />
          </div>
          
          {/* Ziele (optional) */}
          <div>
            <label htmlFor="goals" className="block text-sm font-medium mb-1">
              Ziele (optional, ein Ziel pro Zeile)
            </label>
            <textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Was möchtest du erreichen? Ein Ziel pro Zeile..."
            />
          </div>
          
          {/* Submit-Button */}
          <div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                loading || !query.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Generiere Lösung...' : 'Lösung generieren'}
            </button>
          </div>
        </form>
        
        {/* Fehleranzeige */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {/* Lösungsanzeige */}
      {solution && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Deine Lösung</h2>
            <div className="text-sm text-gray-500">
              Modell: {solution.model_used || 'Unbekannt'} 
              {solution.facts_found && <span className="ml-2 text-green-500">• Fakten gefunden</span>}
            </div>
          </div>
          
          {/* Markdown-Anzeige der Lösung */}
          <div className="prose dark:prose-invert max-w-none">
            <Markdown>{solution.solution}</Markdown>
          </div>
          
          {/* Metadaten */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
            <div className="flex flex-wrap gap-4">
              {solution.processing_time && (
                <div>Verarbeitungszeit: {solution.processing_time.toFixed(2)}s</div>
              )}
              {solution.token_count && (
                <div>Tokens: {solution.token_count}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
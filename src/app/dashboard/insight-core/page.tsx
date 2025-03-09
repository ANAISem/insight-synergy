'use client';

import React from 'react';
import Link from 'next/link';

export default function InsightCorePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insight Core</h1>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              Zurück zum Dashboard
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Willkommen bei Insight Core. Hier kannst du innovative Lösungen für deine Probleme generieren.
          </p>
        </div>
        
        <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Lösungsgenerator</h2>
            
            <form className="space-y-4">
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deine Frage oder dein Problem
                </label>
                <textarea
                  id="query"
                  rows={3}
                  className="mt-1 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2"
                  placeholder="Beschreibe dein Problem..."
                />
              </div>
              
              <div>
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  onClick={() => alert('Diese Funktion wird bald verfügbar sein!')}
                >
                  Lösung generieren
                </button>
              </div>
            </form>
            
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Info</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Die vollständige Integration von Insight Core ist derzeit in Arbeit. Bald kannst du 
                hier innovative Lösungen für deine Probleme generieren, die auf einer Faktenbasis und 
                modernsten KI-Modellen basieren.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
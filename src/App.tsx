import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/contexts/i18n-context';
import { DebateRealtime } from '@/components/nexus/DebateRealtime';

// Beispiel-Experten für die Demo
const demoExperts = [
  {
    id: 'expert1',
    name: 'Dr. Maria Schmidt',
    specialty: 'Klimaforschung',
    avatar: 'https://i.pravatar.cc/150?img=1',
    color: '#4f46e5'
  },
  {
    id: 'expert2',
    name: 'Prof. Thomas Weber',
    specialty: 'Wirtschaftswissenschaften',
    avatar: 'https://i.pravatar.cc/150?img=2',
    color: '#0ea5e9'
  },
  {
    id: 'expert3',
    name: 'Dr. Julia Müller',
    specialty: 'Soziologie',
    avatar: 'https://i.pravatar.cc/150?img=3',
    color: '#10b981'
  }
];

export function App() {
  return (
    <I18nProvider>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-lg border bg-card p-4 md:p-6 shadow-sm">
            <DebateRealtime 
              debateId="demo-debate-123"
              initialExperts={demoExperts}
              onConnectionStatusChange={(status) => console.log('Connection status:', status)}
            />
          </div>
        </div>
        <Toaster />
      </div>
    </I18nProvider>
  );
}

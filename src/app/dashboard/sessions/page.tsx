import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, createAdminClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default async function SessionsPage() {
  // Server-seitige Authentifizierungsprüfung
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  const { data } = await supabase.auth.getSession();
  
  // Wenn kein Benutzer eingeloggt ist, zum Login weiterleiten
  if (!data.session) {
    redirect('/auth/login');
  }
  
  // Admin-Client für direkte Datenbankabfragen
  const adminClient = createAdminClient();
  
  // Sitzungen des Benutzers abrufen
  const { data: sessions, error } = await adminClient
    .from('user_sessions')
    .select('*')
    .eq('user_id', data.session.user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Fehler beim Abrufen der Sitzungen:', error);
  }
  
  // Formatierungsfunktion für Datum
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meine Sitzungen</h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Zurück zum Dashboard
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Hier findest du deine gespeicherten Sitzungen und Lösungen.
          </p>
        </div>
        
        {/* Sitzungstabelle */}
        <div className="mt-6 px-4 sm:px-0">
          <div className="overflow-hidden bg-white dark:bg-gray-800 shadow rounded-lg">
            {sessions && sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Titel
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Modell
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Erstellt am
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {session.title || 'Unbenannte Sitzung'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {session.model_used || 'Unbekannt'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {session.tokens_used || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {formatDate(session.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/dashboard/sessions/${session.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Anzeigen
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {error ? 'Fehler beim Laden der Sitzungen.' : 'Keine Sitzungen gefunden.'}
                </p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Neue Lösung generieren
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
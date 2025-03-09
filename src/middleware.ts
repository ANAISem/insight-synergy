import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Supabase Auth-Helfer erstellen
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Session abrufen
  const { data: { session } } = await supabase.auth.getSession();

  // Paths, die Authentifizierung erfordern
  const authRequiredPaths = [
    '/dashboard',
    '/settings',
    '/api/insight-core', // Unsere API-Routen für Insight Core
  ];

  // Authentifizierte Pfade überprüfen
  const isAuthRequiredPath = authRequiredPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth-Pfade (wo Benutzer nicht eingeloggt sein sollten)
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth/');

  // Wenn kein Benutzer eingeloggt ist und Authentifizierung erforderlich ist
  if (!session && isAuthRequiredPath) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Wenn Benutzer eingeloggt ist und versucht, auf Auth-Pfade zuzugreifen
  if (session && isAuthPath) {
    // Weiterleitung zum Dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Alle Routen, die die Middleware auslösen sollen
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 
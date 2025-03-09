import { NextRequest, NextResponse } from 'next/server';
import { getCreditPackageById } from '@/lib/stripe/stripeClient';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

// Initialisiere Stripe mit dem Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // aktuelle API-Version verwenden
});

export async function POST(req: NextRequest) {
  try {
    // Stelle sicher, dass der Benutzer angemeldet ist
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Authentifizierung prüfen
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert. Bitte melden Sie sich an.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { packageId, successUrl, cancelUrl } = body;

    // Validate input
    if (!packageId) {
      return NextResponse.json(
        { error: 'Paket-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Get credit package details
    const creditPackage = getCreditPackageById(packageId);
    if (!creditPackage) {
      return NextResponse.json(
        { error: `Kreditpaket mit ID ${packageId} nicht gefunden` },
        { status: 404 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: creditPackage.currency,
            product_data: {
              name: `${creditPackage.name} Credit-Paket`,
              description: `${creditPackage.credits} Credits für Insight Synergy`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=canceled`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        packageId: packageId,
        credits: creditPackage.credits.toString(),
      },
    });

    // Speichere die Session-Information in der Datenbank für spätere Validierung
    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert([
        {
          session_id: session.id,
          user_id: user.id,
          package_id: packageId,
          credits: creditPackage.credits,
          amount: creditPackage.price,
          currency: creditPackage.currency,
          status: 'pending',
        },
      ]);

    if (dbError) {
      console.error('Fehler beim Speichern der Session in der Datenbank:', dbError);
      // Obwohl ein Fehler beim Speichern aufgetreten ist, können wir trotzdem die Session-ID zurückgeben
    }

    // Return session ID for client-side redirection
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Fehler bei der Erstellung der Checkout-Session:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Erstellung der Checkout-Session' },
      { status: 500 }
    );
  }
} 
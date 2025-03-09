/**
 * API-Route für die Erstellung einer Stripe Checkout-Session zum Kauf von Credits
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Importiere das Kreditsystem zur Aktualisierung der Kredite nach erfolgreicher Zahlung
import { updateUserCredits } from '@/lib/api/server/credit-system';

// Stripe-Instanz
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Definierte Kredit-Pakete (in einer realen Anwendung würden diese aus einer Datenbank geladen)
const CREDIT_PACKAGES = {
  'credit-100': { amount: 100, price: 499, name: '100 Credits', description: 'Kleines Paket mit 100 Credits' },
  'credit-500': { amount: 500, price: 1999, name: '500 Credits', description: 'Mittleres Paket mit 500 Credits' },
  'credit-1000': { amount: 1000, price: 3499, name: '1000 Credits', description: 'Großes Paket mit 1000 Credits' },
};

export async function POST(request: NextRequest) {
  try {
    // Parse die Anfrage
    const body = await request.json();
    const { packageId, successUrl, cancelUrl } = body;

    // Validiere die Eingabe
    if (!packageId || !CREDIT_PACKAGES[packageId]) {
      return NextResponse.json(
        { error: 'Ungültiges Credit-Paket' },
        { status: 400 }
      );
    }

    // Holen Supabase-Client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Hole den aktuellen Benutzer
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Hole Benutzerinformationen aus der Datenbank
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Wähle das Credit-Paket
    const creditPackage = CREDIT_PACKAGES[packageId];
    
    // Erstelle die Checkout-Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.price, // in Cent
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=cancelled`,
      customer_email: userEmail,
      metadata: {
        userId,
        packageId,
        creditsAmount: creditPackage.amount,
        type: 'credit_purchase',
      },
    });
    
    // Speichere die Session-ID in der Datenbank, um sie bei der Webhook-Verarbeitung zu validieren
    await supabase
      .from('payment_sessions')
      .insert({
        user_id: userId,
        session_id: checkoutSession.id,
        amount: creditPackage.price,
        credits_amount: creditPackage.amount,
        status: 'pending',
        type: 'credit_purchase',
        metadata: { packageId },
      });
    
    // Gib die Session-URL zurück
    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
    
  } catch (error) {
    console.error('Fehler bei der Erstellung der Checkout-Session:', error);
    
    return NextResponse.json(
      { error: 'Fehler bei der Erstellung der Checkout-Session' },
      { status: 500 }
    );
  }
} 
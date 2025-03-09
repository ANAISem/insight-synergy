import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { createClient } from '@/lib/supabase/server';

// Initialisiere Stripe mit dem Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Aktuelle API-Version
});

export async function POST(req: NextRequest) {
  try {
    // Überprüfe Authentifizierung
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Hole Benutzerdaten aus der Anfrage
    const body = await req.json();
    const { packageId, credits, successUrl, cancelUrl } = body;
    
    if (!packageId || !credits || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Hole Benutzer aus Supabase
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', session.user.email)
      .single();
      
    if (userError || !userData) {
      console.error('Fehler beim Abrufen des Benutzers:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    let stripeCustomerId = userData.stripe_customer_id;
    
    // Erstelle Stripe-Kunde, falls noch nicht vorhanden
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: userData.id
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Aktualisiere Benutzer mit Stripe-Kunden-ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userData.id);
    }
    
    // Preisberechnung basierend auf dem Paket
    let unitAmount;
    switch (packageId) {
      case 'basic':
        unitAmount = 499; // 4,99 € in Cent
        break;
      case 'pro':
        unitAmount = 1999; // 19,99 € in Cent
        break;
      case 'enterprise':
        unitAmount = 3499; // 34,99 € in Cent
        break;
      default:
        // Berechne Standardpreis basierend auf Credits
        unitAmount = Math.round(credits * 5); // 5 Cent pro Credit
    }
    
    // Erstelle Checkout-Sitzung
    const stripeSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${credits} Insight Synergy Credits`,
              description: `${credits} Credits für dein Insight Synergy-Konto`,
              images: ['https://example.com/credit-package.png'],
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: userData.id,
        credits,
        packageId,
        type: 'onetime'
      },
    });
    
    return NextResponse.json({
      sessionId: stripeSession.id,
      url: stripeSession.url
    });
  } catch (error: any) {
    console.error('Fehler bei der Erstellung der Checkout-Sitzung:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}; 
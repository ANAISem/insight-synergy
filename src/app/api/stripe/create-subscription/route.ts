import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionPlanById } from '@/lib/stripe/stripeClient';
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
    const { planId, successUrl, cancelUrl } = body;

    // Validate input
    if (!planId) {
      return NextResponse.json(
        { error: 'Plan-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Get subscription plan details
    const subscriptionPlan = getSubscriptionPlanById(planId);
    if (!subscriptionPlan) {
      return NextResponse.json(
        { error: `Abonnementplan mit ID ${planId} nicht gefunden` },
        { status: 404 }
      );
    }

    // Skip checkout for free plans
    if (subscriptionPlan.price === 0) {
      // Aktiviere kostenloses Abonnement direkt
      const { error: dbError } = await supabase
        .from('user_subscriptions')
        .insert([
          {
            user_id: user.id,
            plan_id: planId,
            status: 'active',
            credits_per_day: subscriptionPlan.creditsPerDay,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
          },
        ]);

      if (dbError) {
        console.error('Fehler beim Aktivieren des kostenlosen Abonnements:', dbError);
        return NextResponse.json(
          { error: 'Fehler beim Aktivieren des kostenlosen Abonnements' },
          { status: 500 }
        );
      }

      // Fügen Sie kostenlose tägliche Credits hinzu
      const { error: creditsError } = await supabase
        .from('user_credits')
        .update({ 
          free_credits_per_day: subscriptionPlan.creditsPerDay,
          subscription_plan: planId 
        })
        .eq('user_id', user.id);

      if (creditsError) {
        console.error('Fehler beim Aktualisieren der täglichen Credits:', creditsError);
      }

      // Erfolgreich aktiviert
      return NextResponse.json({
        success: true,
        message: 'Kostenloses Abonnement wurde aktiviert',
        planId: planId,
      });
    }

    // Create Stripe Checkout Session for paid plans
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: subscriptionPlan.stripePriceId, // Verwende die Preis-ID von Stripe
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=canceled`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planId: planId,
        creditsPerDay: subscriptionPlan.creditsPerDay.toString(),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: planId,
        },
      },
    });

    // Speichere die Session-Information in der Datenbank für spätere Validierung
    const { error: dbError } = await supabase
      .from('subscription_sessions')
      .insert([
        {
          session_id: session.id,
          user_id: user.id,
          plan_id: planId,
          credits_per_day: subscriptionPlan.creditsPerDay,
          price: subscriptionPlan.price,
          currency: subscriptionPlan.currency,
          interval: subscriptionPlan.interval,
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
    console.error('Fehler bei der Erstellung der Subscription-Session:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Erstellung der Subscription-Session' },
      { status: 500 }
    );
  }
} 
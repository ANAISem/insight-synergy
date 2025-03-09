/**
 * API-Route für den Stripe Webhook
 * 
 * Verarbeitet Zahlungsereignisse von Stripe, um Credits nach erfolgreicher Zahlung gutzuschreiben
 * und Abonnementstatus zu aktualisieren.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Initialisiere Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialisiere Supabase Admin-Client, da der Webhook ohne Browser-Cookies auskommt
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Service-Role-Key für admin-ähnliche Operationen
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Fehlende Webhook-Signatur oder Secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Verifiziere die Webhook-Signatur
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const error = err as Error;
      console.error(`Webhook-Signatur-Fehler: ${error.message}`);
      return NextResponse.json(
        { error: `Webhook-Signatur-Fehler: ${error.message}` },
        { status: 400 }
      );
    }

    // Handle verschiedene Event-Typen
    switch (event.type) {
      // Erfolgreiche Zahlung für Credits
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Verarbeite nur Einmalzahlungen, keine Abonnements
        if (session.mode === 'payment') {
          await handleSuccessfulPayment(session);
        } else if (session.mode === 'subscription') {
          await handleNewSubscription(session);
        }
        break;
      }

      // Neue Abonnement-Zahlung
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleSuccessfulInvoice(invoice);
        break;
      }

      // Fehlgeschlagene Abonnement-Zahlung
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleFailedInvoice(invoice);
        break;
      }

      // Abonnement wurde gekündigt
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCanceledSubscription(subscription);
        break;
      }

      // Abonnement wurde aktualisiert (z.B. Plan-Änderung)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleUpdatedSubscription(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook-Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

/**
 * Verarbeitet erfolgreiche Einmalzahlungen für Credits
 */
async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const sessionId = session.id;
  const metadata = session.metadata || {};

  if (!userId) {
    console.error('Zahlungs-Session ohne client_reference_id (userId)');
    return;
  }

  try {
    // Suche nach der Session in der Datenbank
    const { data: paymentSession, error: queryError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (queryError || !paymentSession) {
      console.error('Zahlungs-Session nicht in der Datenbank gefunden:', queryError);
      
      // Wenn die Session nicht in der Datenbank gefunden wurde,
      // versuche, die Credits basierend auf den Metadaten hinzuzufügen
      if (metadata.credits && metadata.packageId) {
        const credits = parseInt(metadata.credits, 10);
        const packageId = metadata.packageId;
        
        await addCreditsToUser(userId, credits, sessionId, packageId);
      } else {
        console.error('Keine Credits-Informationen in Metadaten gefunden');
      }
      return;
    }

    // Session wurde gefunden, füge Credits hinzu
    await addCreditsToUser(
      userId,
      paymentSession.credits,
      sessionId,
      paymentSession.package_id
    );

    // Aktualisiere den Status der Zahlungs-Session
    await supabase
      .from('payment_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der erfolgreichen Zahlung:', error);
  }
}

/**
 * Fügt Credits zum Benutzerkonto hinzu
 */
async function addCreditsToUser(
  userId: string,
  credits: number,
  sessionId: string,
  packageId: string
) {
  try {
    // Aktualisiere verfügbare Credits
    const { data: currentCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('available_credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Fehler beim Abrufen der aktuellen Credits:', creditsError);
      
      // Erstelle einen neuen Credits-Eintrag, falls keiner existiert
      const { error: insertError } = await supabase
        .from('user_credits')
        .insert([
          {
            user_id: userId,
            available_credits: credits,
            total_purchased: credits,
          },
        ]);

      if (insertError) {
        console.error('Fehler beim Erstellen des Credits-Eintrags:', insertError);
      }
    } else {
      // Aktualisiere vorhandenen Credits-Eintrag
      const newTotal = (currentCredits?.available_credits || 0) + credits;
      
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          available_credits: newTotal,
          total_purchased: supabase.rpc('increment', { x: credits }),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Fehler beim Aktualisieren der Credits:', updateError);
      }
    }

    // Erstelle einen Transaktionseintrag
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert([
        {
          user_id: userId,
          amount: credits,
          type: 'purchase',
          description: `Kauf eines ${packageId}-Kredit-Pakets`,
          reference_id: sessionId,
        },
      ]);

    if (transactionError) {
      console.error('Fehler beim Erstellen der Transaktion:', transactionError);
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen von Credits:', error);
  }
}

/**
 * Verarbeitet ein neues Abonnement
 */
async function handleNewSubscription(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const sessionId = session.id;
  const metadata = session.metadata || {};
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('Abonnement-Session ohne client_reference_id oder subscription_id');
    return;
  }

  try {
    // Hole Abonnement-Details von Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const planId = metadata.planId || '';
    const creditsPerDay = parseInt(metadata.creditsPerDay || '0', 10);

    // Aktualisiere den Status der Abonnement-Session
    await supabase
      .from('subscription_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        subscription_id: subscriptionId,
      })
      .eq('session_id', sessionId);

    // Erstelle oder aktualisiere den Abonnement-Eintrag
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert([
        {
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          plan_id: planId,
          status: subscription.status,
          credits_per_day: creditsPerDay,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
      ])
      .onConflict('user_id')
      .merge();

    if (subscriptionError) {
      console.error('Fehler beim Speichern des Abonnements:', subscriptionError);
    }

    // Aktualisiere die Benutzer-Credits
    const { error: creditsError } = await supabase
      .from('user_credits')
      .update({
        free_credits_per_day: creditsPerDay,
        subscription_plan: planId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (creditsError) {
      console.error('Fehler beim Aktualisieren der Credits-Einstellungen:', creditsError);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des neuen Abonnements:', error);
  }
}

/**
 * Verarbeitet eine erfolgreiche Abonnement-Rechnung
 */
async function handleSuccessfulInvoice(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  try {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );
    
    const metadata = subscription.metadata || {};
    const userId = metadata.userId;
    
    if (!userId) {
      console.error('Abonnement ohne userId in den Metadaten');
      return;
    }
    
    // Aktualisiere den Abonnement-Status in der Datenbank
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) {
      console.error('Fehler beim Aktualisieren des Abonnement-Status:', updateError);
    }
    
    // Erstelle einen Transaktionseintrag für die Abonnementzahlung
    const { error: transactionError } = await supabase
      .from('subscription_transactions')
      .insert([
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        },
      ]);
    
    if (transactionError) {
      console.error('Fehler beim Erstellen des Transaktionseintrags:', transactionError);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der erfolgreichen Rechnung:', error);
  }
}

/**
 * Verarbeitet eine fehlgeschlagene Abonnement-Rechnung
 */
async function handleFailedInvoice(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  try {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );
    
    // Aktualisiere den Abonnement-Status in der Datenbank
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) {
      console.error('Fehler beim Aktualisieren des Abonnement-Status:', updateError);
    }
    
    // Erstelle einen Transaktionseintrag für die fehlgeschlagene Zahlung
    const metadata = subscription.metadata || {};
    const userId = metadata.userId;
    
    if (userId) {
      const { error: transactionError } = await supabase
        .from('subscription_transactions')
        .insert([
          {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          },
        ]);
      
      if (transactionError) {
        console.error('Fehler beim Erstellen des Transaktionseintrags:', transactionError);
      }
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der fehlgeschlagenen Rechnung:', error);
  }
}

/**
 * Verarbeitet ein gekündigtes Abonnement
 */
async function handleCanceledSubscription(subscription: Stripe.Subscription) {
  try {
    // Aktualisiere den Abonnement-Status in der Datenbank
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) {
      console.error('Fehler beim Aktualisieren des Abonnement-Status:', updateError);
    }
    
    // Hole die Benutzer-ID aus der Datenbank
    const { data: subscriptionData, error: queryError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (queryError || !subscriptionData) {
      console.error('Abonnement nicht in der Datenbank gefunden:', queryError);
      return;
    }
    
    // Setze die Benutzer-Credits zurück (auf Free-Tier)
    const { error: creditsError } = await supabase
      .from('user_credits')
      .update({
        free_credits_per_day: 5, // Grundwert für Free-Tier
        subscription_plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', subscriptionData.user_id);
    
    if (creditsError) {
      console.error('Fehler beim Zurücksetzen der Credits-Einstellungen:', creditsError);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des gekündigten Abonnements:', error);
  }
}

/**
 * Verarbeitet ein aktualisiertes Abonnement
 */
async function handleUpdatedSubscription(subscription: Stripe.Subscription) {
  try {
    // Aktualisiere den Abonnement-Eintrag in der Datenbank
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) {
      console.error('Fehler beim Aktualisieren des Abonnement-Eintrags:', updateError);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung des aktualisierten Abonnements:', error);
  }
}

// Diese Konfiguration ermöglicht größere Payload-Größen für Webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}; 
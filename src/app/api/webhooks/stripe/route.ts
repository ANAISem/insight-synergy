import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Initialisiere Stripe mit dem Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Aktuelle API-Version
});

// Stripe Webhook Secret für die Validierung
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature') as string;
    
    // Überprüfe, ob der Webhook-Secret vorhanden ist
    if (!webhookSecret) {
      console.error('Stripe Webhook Secret ist nicht konfiguriert.');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }
    
    // Verifiziere die Signatur des Webhook-Events
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook-Signatur-Überprüfung fehlgeschlagen: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
    
    // Supabase-Client für Datenbankzugriffe
    const supabase = createClient();
    
    // Verarbeite verschiedene Webhook-Ereignisse
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Stelle sicher, dass die Zahlung erfolgreich war
        if (session.payment_status === 'paid') {
          const { userId, credits, packageId, type } = session.metadata!;
          
          if (!userId || !credits) {
            console.error('Fehlende Metadaten in der Checkout-Sitzung.');
            return NextResponse.json(
              { error: 'Missing session metadata' },
              { status: 400 }
            );
          }
          
          // Konvertiere Credits zu einer Zahl
          const creditAmount = parseInt(credits as string, 10);
          
          // Füge Credits zum Benutzerkonto hinzu
          const { data: userCredits, error: selectError } = await supabase
            .from('user_credits')
            .select('available_credits')
            .eq('user_id', userId)
            .single();
            
          if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Fehler beim Abrufen der Benutzer-Credits:', selectError);
            return NextResponse.json(
              { error: 'Error fetching user credits' },
              { status: 500 }
            );
          }
          
          // Entweder aktualisiere bestehende Credits oder erstelle einen neuen Eintrag
          if (userCredits) {
            const newCreditAmount = userCredits.available_credits + creditAmount;
            
            const { error: updateError } = await supabase
              .from('user_credits')
              .update({ available_credits: newCreditAmount })
              .eq('user_id', userId);
              
            if (updateError) {
              console.error('Fehler beim Aktualisieren der Credits:', updateError);
              return NextResponse.json(
                { error: 'Error updating credits' },
                { status: 500 }
              );
            }
          } else {
            const { error: insertError } = await supabase
              .from('user_credits')
              .insert({ user_id: userId, available_credits: creditAmount });
              
            if (insertError) {
              console.error('Fehler beim Erstellen des Credits-Eintrags:', insertError);
              return NextResponse.json(
                { error: 'Error creating credits entry' },
                { status: 500 }
              );
            }
          }
          
          // Speichere die Transaktion in der Datenbank
          const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert({
              user_id: userId,
              amount: creditAmount,
              type: 'purchase',
              description: `Kauf von ${creditAmount} Credits (${packageId})`,
              payment_id: session.id,
              payment_method: 'stripe',
              package_id: packageId
            });
            
          if (transactionError) {
            console.error('Fehler beim Speichern der Transaktion:', transactionError);
            return NextResponse.json(
              { error: 'Error saving transaction' },
              { status: 500 }
            );
          }
        }
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Finde den Benutzer anhand der Stripe-Kunden-ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (userError || !userData) {
          console.error('Benutzer nicht gefunden:', userError);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        // Aktualisiere den Abonnementstatus des Benutzers
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userData.id,
            subscription_id: subscription.id,
            status: subscription.status,
            plan_id: subscription.items.data[0]?.price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          });
          
        if (updateError) {
          console.error('Fehler beim Aktualisieren des Abonnements:', updateError);
          return NextResponse.json(
            { error: 'Error updating subscription' },
            { status: 500 }
          );
        }
        
        // Wenn das Abonnement aktiv ist, füge monatliche Credits hinzu
        if (subscription.status === 'active') {
          // Bestimme die Anzahl der Credits basierend auf dem Abonnement
          // Dies sollte in einer realen Anwendung auf Basis des tatsächlichen Plans erfolgen
          let creditAmount = 100; // Standard: 100 Credits
          
          // Hole die Metadaten aus dem ersten Artikel des Abonnements
          const metadata = subscription.items.data[0]?.price.product as { metadata?: { credits?: string } };
          
          if (metadata && metadata.metadata && metadata.metadata.credits) {
            creditAmount = parseInt(metadata.metadata.credits, 10);
          }
          
          // Füge Credits zum Benutzerkonto hinzu
          const { data: userCredits, error: selectError } = await supabase
            .from('user_credits')
            .select('available_credits')
            .eq('user_id', userData.id)
            .single();
            
          if (selectError && selectError.code !== 'PGRST116') {
            console.error('Fehler beim Abrufen der Benutzer-Credits:', selectError);
            return NextResponse.json(
              { error: 'Error fetching user credits' },
              { status: 500 }
            );
          }
          
          // Entweder aktualisiere bestehende Credits oder erstelle einen neuen Eintrag
          if (userCredits) {
            const newCreditAmount = userCredits.available_credits + creditAmount;
            
            const { error: updateError } = await supabase
              .from('user_credits')
              .update({ available_credits: newCreditAmount })
              .eq('user_id', userData.id);
              
            if (updateError) {
              console.error('Fehler beim Aktualisieren der Credits:', updateError);
              return NextResponse.json(
                { error: 'Error updating credits' },
                { status: 500 }
              );
            }
          } else {
            const { error: insertError } = await supabase
              .from('user_credits')
              .insert({ user_id: userData.id, available_credits: creditAmount });
              
            if (insertError) {
              console.error('Fehler beim Erstellen des Credits-Eintrags:', insertError);
              return NextResponse.json(
                { error: 'Error creating credits entry' },
                { status: 500 }
              );
            }
          }
          
          // Speichere die Transaktion in der Datenbank
          const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert({
              user_id: userData.id,
              amount: creditAmount,
              type: 'subscription',
              description: `Monatliche Credits aus Abonnement`,
              payment_id: subscription.id,
              payment_method: 'stripe'
            });
            
          if (transactionError) {
            console.error('Fehler beim Speichern der Transaktion:', transactionError);
            return NextResponse.json(
              { error: 'Error saving transaction' },
              { status: 500 }
            );
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Finde den Benutzer anhand der Stripe-Kunden-ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (userError || !userData) {
          console.error('Benutzer nicht gefunden:', userError);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        // Aktualisiere den Abonnementstatus als gekündigt
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            canceled_at: new Date().toISOString()
          })
          .eq('user_id', userData.id)
          .eq('subscription_id', subscription.id);
          
        if (updateError) {
          console.error('Fehler beim Aktualisieren des Abonnements:', updateError);
          return NextResponse.json(
            { error: 'Error updating subscription' },
            { status: 500 }
          );
        }
        break;
      }
      
      default:
        console.log(`Unbehandeltes Stripe-Event: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Fehler bei der Verarbeitung des Webhook-Events:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}; 
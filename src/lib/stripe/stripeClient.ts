/**
 * Stripe Client für Insight Synergy
 * 
 * Bietet Frontend-Integration mit Stripe für Zahlungen und Abonnements.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe öffentlicher Schlüssel aus Umgebungsvariablen
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Prüfe, ob der Stripe-Key vorhanden ist
if (!stripePublicKey) {
  console.warn('Stripe Publishable Key nicht gefunden. Zahlungsfunktionen werden nicht verfügbar sein.');
}

// Preisdaten für Credit-Pakete
export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number; // in Cent
  currency: string;
  stripePriceId: string;
  popular?: boolean;
  savePercentage?: number;
}

// Abo-Pläne
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in Cent
  currency: string;
  stripePriceId: string;
  interval: 'month' | 'year';
  creditsPerDay: number;
  features: string[];
  popular?: boolean;
}

// Verfügbare Credit-Pakete
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'basic',
    name: 'Starter',
    description: 'Für gelegentliche Nutzung',
    credits: 100,
    price: 499, // 4,99€
    currency: 'eur',
    stripePriceId: 'price_basic_credits',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Beliebteste Option',
    credits: 500,
    price: 1999, // 19,99€
    currency: 'eur',
    stripePriceId: 'price_standard_credits',
    popular: true,
    savePercentage: 20,
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'Für intensive Nutzung',
    credits: 1000,
    price: 3499, // 34,99€
    currency: 'eur',
    stripePriceId: 'price_pro_credits',
    savePercentage: 30,
  },
];

// Verfügbare Abonnement-Pläne
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Einstieg in Insight Synergy',
    price: 0,
    currency: 'eur',
    stripePriceId: '',
    interval: 'month',
    creditsPerDay: 5,
    features: [
      '5 kostenlose Credits pro Tag',
      'Zugang zu Insight Core',
      'Grundlegende Faktenprüfung',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    description: 'Erweiterte Funktionen und mehr Credits',
    price: 999, // 9,99€
    currency: 'eur',
    stripePriceId: 'price_plus_monthly',
    interval: 'month',
    creditsPerDay: 20,
    popular: true,
    features: [
      '20 Credits pro Tag inklusive',
      'Zugang zu The Nexus',
      'Erweiterte Faktenprüfung',
      'Exportfunktionen',
      'Prioritäts-Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Für professionelle Nutzer',
    price: 1999, // 19,99€
    currency: 'eur',
    stripePriceId: 'price_pro_monthly',
    interval: 'month',
    creditsPerDay: 50,
    features: [
      '50 Credits pro Tag inklusive',
      'Vollständiger Zugang zu allen Modulen',
      'Umfassende Faktenprüfung',
      'Cognitive Loop AI',
      'Prioritäts-Support',
      'API-Zugang',
    ],
  },
];

// Stripe Singleton-Instanz
let stripePromise: Promise<Stripe | null>;

/**
 * Gibt die Stripe-Instanz zurück, initialisiert sie bei Bedarf
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise && stripePublicKey) {
    stripePromise = loadStripe(stripePublicKey);
  }
  return stripePromise || Promise.resolve(null);
};

/**
 * Initialisiert eine Checkout-Session für den Kauf von Credits
 */
export const createCheckoutSession = async (packageId: string, successUrl?: string, cancelUrl?: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        packageId,
        successUrl: successUrl || `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: cancelUrl || `${window.location.origin}/dashboard?payment=canceled`,
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Erstellen der Checkout-Session');
    }
    
    return data.sessionId;
  } catch (error) {
    console.error('Fehler beim Erstellen der Checkout-Session:', error);
    return null;
  }
};

/**
 * Initialisiert eine Checkout-Session für ein Abonnement
 */
export const createSubscriptionSession = async (planId: string, successUrl?: string, cancelUrl?: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/stripe/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        successUrl: successUrl || `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: cancelUrl || `${window.location.origin}/dashboard?subscription=canceled`,
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Erstellen der Subscription-Session');
    }
    
    return data.sessionId;
  } catch (error) {
    console.error('Fehler beim Erstellen der Subscription-Session:', error);
    return null;
  }
};

/**
 * Weiterleitungsfunktion zum Stripe Checkout
 */
export const redirectToCheckout = async (sessionId: string): Promise<{ error: Error | null }> => {
  const stripe = await getStripe();
  
  if (!stripe) {
    return {
      error: new Error('Stripe konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut.'),
    };
  }
  
  const result = await stripe.redirectToCheckout({
    sessionId,
  });
  
  if (result.error) {
    return { error: result.error };
  }
  
  return { error: null };
};

/**
 * Formatiert den Preis in der entsprechenden Währung
 */
export const formatPrice = (price: number, currency: string = 'eur'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(price / 100);
};

/**
 * Berechnet den Preis pro Credit
 */
export const calculatePricePerCredit = (price: number, credits: number): string => {
  const pricePerCredit = price / credits;
  return (pricePerCredit / 100).toFixed(3);
};

/**
 * Findet ein Credit-Paket anhand seiner ID
 */
export const getCreditPackageById = (packageId: string): CreditPackage | undefined => {
  return CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
};

/**
 * Findet einen Abo-Plan anhand seiner ID
 */
export const getSubscriptionPlanById = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
}; 
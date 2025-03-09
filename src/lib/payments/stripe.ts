/**
 * Stripe-Integrations-Client für Payments
 * 
 * Dieser Client verwaltet die Verbindung zu Stripe für Zahlungen,
 * Abonnements und die Verwaltung von Credits im Insight Synergy System.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { coreApiClient } from '../api/apiClient';

// Stripe öffentlicher Schlüssel aus Umgebungsvariablen
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Credit-Pakete
export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  creditAmount: number;
  price: number;
  currency: string;
  popular?: boolean;
  savePercentage?: number;
  stripePriceId: string;
}

// Standard Credit-Pakete
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: '100 Credits für einfache Projekte',
    creditAmount: 100,
    price: 4.99,
    currency: 'EUR',
    stripePriceId: 'price_basic',
  },
  {
    id: 'pro',
    name: 'Professional',
    description: '500 Credits mit 20% Ersparnis',
    creditAmount: 500,
    price: 19.99,
    currency: 'EUR',
    popular: true,
    savePercentage: 20,
    stripePriceId: 'price_pro',
  },
  {
    id: 'max',
    name: 'Maximum',
    description: '1.000 Credits mit 30% Ersparnis',
    creditAmount: 1000,
    price: 34.99,
    currency: 'EUR',
    savePercentage: 30,
    stripePriceId: 'price_max',
  }
];

// Abonnement-Pläne
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  creditAmount: number;
  stripePriceId: string;
  popular?: boolean;
}

// Standard Abonnement-Pläne
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic',
    description: 'Für gelegentliche Nutzung',
    features: [
      '300 Credits pro Monat',
      'Zugriff auf Insight Core',
      'Standard-Modelle'
    ],
    price: 9.99,
    currency: 'EUR',
    billingPeriod: 'monthly',
    creditAmount: 300,
    stripePriceId: 'price_basic_monthly',
  },
  {
    id: 'pro-monthly',
    name: 'Professional',
    description: 'Für regelmäßige Nutzung',
    features: [
      '1.000 Credits pro Monat',
      'Zugriff auf alle Module',
      'Premium-Modelle',
      'Prioritäts-Support'
    ],
    price: 24.99,
    currency: 'EUR',
    billingPeriod: 'monthly',
    creditAmount: 1000,
    stripePriceId: 'price_pro_monthly',
    popular: true,
  },
  {
    id: 'business-monthly',
    name: 'Business',
    description: 'Für intensive Nutzung',
    features: [
      '3.000 Credits pro Monat',
      'Zugriff auf alle Module',
      'Alle Modelle inkl. GPT-4o',
      'Dedizierter Support',
      'Team-Funktionen'
    ],
    price: 59.99,
    currency: 'EUR',
    billingPeriod: 'monthly',
    creditAmount: 3000,
    stripePriceId: 'price_business_monthly',
  }
];

// Singleton für die Stripe-Instanz
let stripePromise: Promise<Stripe | null>;

/**
 * Initialisiert die Stripe-Instanz
 */
const getStripe = () => {
  if (!stripePromise && STRIPE_PK) {
    stripePromise = loadStripe(STRIPE_PK);
  }
  return stripePromise;
};

/**
 * Erstellt eine Checkout-Session für den Kauf von Credits
 */
export const createCreditCheckoutSession = async (
  packageId: string, 
  successUrl?: string, 
  cancelUrl?: string
): Promise<string> => {
  try {
    // Standard-URLs, falls keine angegeben wurden
    const defaultSuccessUrl = `${window.location.origin}/dashboard/credits/success`;
    const defaultCancelUrl = `${window.location.origin}/dashboard/credits`;
    
    // Rufe die API auf, um eine Checkout-Session zu erstellen
    const response = await coreApiClient.post<{ sessionId: string }>('/payments/create-checkout-session', {
      packageId,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
    });
    
    return response.sessionId;
  } catch (error) {
    console.error('Fehler beim Erstellen der Checkout-Session:', error);
    throw new Error('Die Zahlung konnte nicht eingeleitet werden. Bitte versuche es später erneut.');
  }
};

/**
 * Erstellt eine Checkout-Session für ein Abonnement
 */
export const createSubscriptionCheckoutSession = async (
  planId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<string> => {
  try {
    // Standard-URLs, falls keine angegeben wurden
    const defaultSuccessUrl = `${window.location.origin}/dashboard/subscription/success`;
    const defaultCancelUrl = `${window.location.origin}/dashboard/subscription`;
    
    // Rufe die API auf, um eine Checkout-Session zu erstellen
    const response = await coreApiClient.post<{ sessionId: string }>('/payments/create-subscription', {
      planId,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
    });
    
    return response.sessionId;
  } catch (error) {
    console.error('Fehler beim Erstellen des Abonnements:', error);
    throw new Error('Das Abonnement konnte nicht erstellt werden. Bitte versuche es später erneut.');
  }
};

/**
 * Öffnet Stripe Checkout für eine bestimmte Session
 */
export const redirectToCheckout = async (sessionId: string): Promise<void> => {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error('Stripe konnte nicht initialisiert werden.');
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    console.error('Stripe-Fehler:', error);
    throw new Error(error.message || 'Ein Fehler ist aufgetreten.');
  }
};

/**
 * Führt den Kauf von Credits durch
 */
export const purchaseCredits = async (packageId: string): Promise<void> => {
  try {
    // Erstelle Checkout-Session
    const sessionId = await createCreditCheckoutSession(packageId);
    
    // Leite zur Checkout-Seite weiter
    await redirectToCheckout(sessionId);
  } catch (error) {
    console.error('Fehler beim Kauf von Credits:', error);
    throw error;
  }
};

/**
 * Beginnt ein Abonnement
 */
export const startSubscription = async (planId: string): Promise<void> => {
  try {
    // Erstelle Checkout-Session für Abonnement
    const sessionId = await createSubscriptionCheckoutSession(planId);
    
    // Leite zur Checkout-Seite weiter
    await redirectToCheckout(sessionId);
  } catch (error) {
    console.error('Fehler beim Starten des Abonnements:', error);
    throw error;
  }
};

/**
 * Kündigt ein aktives Abonnement
 */
export const cancelSubscription = async (): Promise<boolean> => {
  try {
    // Rufe die API auf, um das Abonnement zu kündigen
    const response = await coreApiClient.post<{ success: boolean }>('/payments/cancel-subscription', {});
    
    return response.success;
  } catch (error) {
    console.error('Fehler beim Kündigen des Abonnements:', error);
    throw new Error('Das Abonnement konnte nicht gekündigt werden. Bitte versuche es später erneut.');
  }
};

/**
 * Ruft die Kundeninformationen von Stripe ab
 */
export const getCustomerPortalUrl = async (): Promise<string> => {
  try {
    // Rufe die API auf, um die Portal-URL zu erhalten
    const response = await coreApiClient.post<{ url: string }>('/payments/customer-portal', {
      returnUrl: `${window.location.origin}/dashboard/billing`,
    });
    
    return response.url;
  } catch (error) {
    console.error('Fehler beim Abrufen der Kundenportal-URL:', error);
    throw new Error('Das Kundenportal konnte nicht geöffnet werden. Bitte versuche es später erneut.');
  }
};

export default {
  purchaseCredits,
  startSubscription,
  cancelSubscription,
  getCustomerPortalUrl,
  CREDIT_PACKAGES,
  SUBSCRIPTION_PLANS,
}; 
/**
 * Stripe API Client
 * 
 * Bietet eine Integration mit der Stripe-Zahlungsplattform für das Credit-System
 * von Insight Synergy. Unterstützt Einmalkäufe und Abonnements.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { BaseApiClient, ApiError } from './apiClient';

// Stripe öffentlicher Schlüssel
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Stripe-Fehlerklasse
export class StripeApiError extends ApiError {
  constructor(message: string, status: number, endpoint: string, errorCode?: string) {
    super(message, status, endpoint, errorCode);
    this.name = 'StripeApiError';
  }
}

// Credit-Paket-Typen
export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  creditsAmount: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  creditsPerMonth: number;
  price: number;
  currency: string;
  billingInterval: 'month' | 'year';
  features: string[];
  recommended?: boolean;
}

// Stripe Checkout Session Antwort
export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

// Stripe API Client
export class StripeApi extends BaseApiClient {
  private stripePromise: Promise<Stripe | null>;
  
  constructor() {
    super('/api/stripe');
    this.stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  }
  
  /**
   * Erstellt eine Checkout-Session für einen Einmalkauf von Credits
   */
  async createCreditCheckoutSession(
    packageId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await this.request<CreateCheckoutSessionResponse>(
        'POST', 
        '/checkout/credits', 
        {
          packageId,
          successUrl: successUrl || `${window.location.origin}/dashboard?purchase=success`,
          cancelUrl: cancelUrl || `${window.location.origin}/dashboard?purchase=cancelled`,
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new StripeApiError(
          error.message,
          error.status,
          error.endpoint,
          error.errorCode
        );
      }
      throw error;
    }
  }
  
  /**
   * Erstellt eine Checkout-Session für ein Abonnement
   */
  async createSubscriptionCheckoutSession(
    planId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await this.request<CreateCheckoutSessionResponse>(
        'POST', 
        '/checkout/subscription', 
        {
          planId,
          successUrl: successUrl || `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: cancelUrl || `${window.location.origin}/dashboard?subscription=cancelled`,
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new StripeApiError(
          error.message,
          error.status,
          error.endpoint,
          error.errorCode
        );
      }
      throw error;
    }
  }
  
  /**
   * Leitet zum Stripe Checkout weiter
   */
  async redirectToCheckout(sessionId: string): Promise<{ error?: Error }> {
    const stripe = await this.stripePromise;
    
    if (!stripe) {
      throw new Error('Stripe konnte nicht geladen werden.');
    }
    
    return stripe.redirectToCheckout({ sessionId });
  }
  
  /**
   * Holt verfügbare Credit-Pakete
   */
  async getAvailableCreditPackages(): Promise<CreditPackage[]> {
    return this.request<CreditPackage[]>('GET', '/packages', undefined, {
      useCaching: true,
      cacheTTL: 3600 * 1000 // 1 Stunde Cache
    });
  }
  
  /**
   * Holt verfügbare Abonnement-Pläne
   */
  async getAvailableSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.request<SubscriptionPlan[]>('GET', '/plans', undefined, {
      useCaching: true,
      cacheTTL: 3600 * 1000 // 1 Stunde Cache
    });
  }
  
  /**
   * Holt Details zum aktuellen Abonnement des Nutzers
   */
  async getCurrentSubscription(): Promise<any> {
    return this.request<any>('GET', '/subscription/current');
  }
  
  /**
   * Kündigt das aktuelle Abonnement des Nutzers
   */
  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      'POST',
      '/subscription/cancel'
    );
  }
  
  /**
   * Aktualisiert die Zahlungsmethode des Nutzers
   */
  async updatePaymentMethod(): Promise<CreateCheckoutSessionResponse> {
    return this.request<CreateCheckoutSessionResponse>(
      'POST',
      '/payment-methods/update'
    );
  }
  
  /**
   * Holt die Zahlungshistorie des Nutzers
   */
  async getPaymentHistory(limit: number = 10): Promise<any> {
    return this.request<any>('GET', `/payment-history?limit=${limit}`);
  }
}

// Singleton-Instanz exportieren
export const stripeApi = new StripeApi();

export default stripeApi; 
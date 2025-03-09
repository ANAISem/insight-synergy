/**
 * Integrationstests für die Stripe-Integration
 * 
 * Diese Tests überprüfen die korrekte Funktionalität der Credit-Käufe und Abonnement-Verwaltung
 * mit Mock-Implementierungen der Stripe-API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getStripe, 
  createCheckoutSession, 
  createSubscriptionSession,
  redirectToCheckout,
  formatPrice,
  calculatePricePerCredit,
  getCreditPackageById,
  getSubscriptionPlanById,
  CREDIT_PACKAGES,
  SUBSCRIPTION_PLANS
} from '@/lib/stripe/stripeClient';
import { act, renderHook } from '@testing-library/react';

// Mock für fetch
global.fetch = vi.fn();

// Mock für window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock für loadStripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    redirectToCheckout: vi.fn().mockResolvedValue({ error: null })
  })
}));

describe('Stripe-Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Credit-Pakete', () => {
    it('sollte alle verfügbaren Credit-Pakete enthalten', () => {
      expect(CREDIT_PACKAGES.length).toBeGreaterThan(0);
      
      // Überprüfe, ob jedes Paket die erforderlichen Eigenschaften hat
      CREDIT_PACKAGES.forEach(pkg => {
        expect(pkg).toHaveProperty('id');
        expect(pkg).toHaveProperty('name');
        expect(pkg).toHaveProperty('credits');
        expect(pkg).toHaveProperty('price');
        expect(pkg).toHaveProperty('currency');
        expect(pkg).toHaveProperty('stripePriceId');
      });
    });

    it('sollte ein Credit-Paket anhand seiner ID finden', () => {
      const standardPackage = getCreditPackageById('standard');
      expect(standardPackage).toBeDefined();
      expect(standardPackage?.name).toBe('Standard');
      expect(standardPackage?.credits).toBe(500);

      const nonExistentPackage = getCreditPackageById('nonexistent');
      expect(nonExistentPackage).toBeUndefined();
    });
  });

  describe('Abonnement-Pläne', () => {
    it('sollte alle verfügbaren Abonnement-Pläne enthalten', () => {
      expect(SUBSCRIPTION_PLANS.length).toBeGreaterThan(0);
      
      // Überprüfe, ob jeder Plan die erforderlichen Eigenschaften hat
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('currency');
        expect(plan).toHaveProperty('interval');
        expect(plan).toHaveProperty('creditsPerDay');
        expect(plan).toHaveProperty('features');
      });
    });

    it('sollte einen Abonnement-Plan anhand seiner ID finden', () => {
      const plusPlan = getSubscriptionPlanById('plus');
      expect(plusPlan).toBeDefined();
      expect(plusPlan?.name).toBe('Plus');
      expect(plusPlan?.creditsPerDay).toBe(20);

      const nonExistentPlan = getSubscriptionPlanById('nonexistent');
      expect(nonExistentPlan).toBeUndefined();
    });
  });

  describe('Checkout-Funktionen', () => {
    it('sollte eine Checkout-Session für Credits erstellen', async () => {
      // Mock für fetch-Antwort
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'test_session_id' })
      });

      const sessionId = await createCheckoutSession('standard');
      
      expect(sessionId).toBe('test_session_id');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/stripe/create-checkout-session',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String),
        })
      );
      
      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody).toHaveProperty('packageId', 'standard');
    });

    it('sollte null zurückgeben, wenn die Erstellung der Checkout-Session fehlschlägt', async () => {
      // Mock für fetch-Fehler
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API-Fehler'));

      const sessionId = await createCheckoutSession('standard');
      
      expect(sessionId).toBeNull();
    });

    it('sollte eine Subscription-Session erstellen', async () => {
      // Mock für fetch-Antwort
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'test_subscription_id' })
      });

      const sessionId = await createSubscriptionSession('plus');
      
      expect(sessionId).toBe('test_subscription_id');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/stripe/create-subscription',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String),
        })
      );
      
      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody).toHaveProperty('planId', 'plus');
    });
  });

  describe('Formatierungsfunktionen', () => {
    it('sollte Preise korrekt formatieren', () => {
      expect(formatPrice(1999)).toBe('19,99 €');
      expect(formatPrice(999, 'usd')).toBe('9,99 $');
    });

    it('sollte den Preis pro Credit korrekt berechnen', () => {
      expect(calculatePricePerCredit(1999, 500)).toBe('0.040');
      expect(calculatePricePerCredit(999, 100)).toBe('0.100');
    });
  });
});

// UI-Komponententests können mit React Testing Library implementiert werden
// Hier ein Beispiel für eine einfache Komponente
describe('UI-Komponententest für Stripe-Integration', () => {
  it('sollte Credits kaufen, wenn der Kaufbutton geklickt wird', async () => {
    // Mock für fetch-Antwort
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: 'test_session_id' })
    });

    // Hier würde normalerweise ein Test mit Komponenten-Rendering stehen
    // Da wir die Komponente nicht direkt testen können, simulieren wir den Prozess
    
    // 1. Checkout-Session erstellen
    const sessionId = await createCheckoutSession('standard');
    expect(sessionId).toBe('test_session_id');
    
    // 2. Weiterleitung zum Checkout
    const redirectResult = await redirectToCheckout(sessionId);
    expect(redirectResult.error).toBeNull();
  });
}); 
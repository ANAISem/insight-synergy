'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { SubscriptionPlan, startSubscription } from '@/lib/payments/stripe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[];
  currentPlanId?: string;
  showAnnualToggle?: boolean;
}

export function SubscriptionPlans({
  plans,
  currentPlanId,
  showAnnualToggle = true
}: SubscriptionPlansProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { toast } = useToast();
  
  // Filtere Pläne nach Abrechnungszeitraum
  const filteredPlans = plans.filter(plan => plan.billingPeriod === billingPeriod);
  
  // Sortiere Pläne nach Preis, wobei beliebte Pläne an zweiter Stelle stehen
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    // Wenn ein Plan als beliebt markiert ist, setze ihn an die zweite Stelle
    if (a.popular) return 1;
    if (b.popular) return -1;
    return a.price - b.price;
  });
  
  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlanId) {
      toast({
        title: "Bereits abonniert",
        description: "Du hast diesen Plan bereits abonniert.",
      });
      return;
    }
    
    try {
      setIsLoading(planId);
      
      // Starte den Stripe-Checkout-Prozess
      await startSubscription(planId);
      
      // Hinweis: Der Benutzer wird nach dem Checkout zur success_url umgeleitet,
      // daher wird dieser Code hier in der Regel nicht ausgeführt
    } catch (error) {
      console.error('Fehler beim Starten des Abonnements:', error);
      
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Das Abonnement konnte nicht gestartet werden. Bitte versuche es später erneut.",
      });
      
      setIsLoading(null);
    }
  };
  
  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };
  
  return (
    <div className="space-y-6">
      {showAnnualToggle && (
        <div className="flex justify-center">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monatlich</TabsTrigger>
              <TabsTrigger value="yearly">
                Jährlich
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  2 Monate gratis
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`flex flex-col ${
              plan.popular 
                ? 'border-primary shadow-lg ring-1 ring-primary' 
                : ''
            }`}
          >
            {plan.popular && (
              <div className="mx-auto -mt-4 flex h-8 w-auto items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
                Beliebt
              </div>
            )}
            
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  {formatCurrency(plan.price, plan.currency)}
                </span>
                <span className="text-muted-foreground">
                  /{billingPeriod === 'monthly' ? 'Monat' : 'Jahr'}
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-baseline">
                    <Check className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isLoading !== null || plan.id === currentPlanId}
              >
                {isLoading === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird bearbeitet...
                  </>
                ) : plan.id === currentPlanId ? (
                  "Aktueller Plan"
                ) : (
                  "Auswählen"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Alle Preise verstehen sich inklusive Mehrwertsteuer. Die Abrechnung erfolgt
          {billingPeriod === 'monthly' ? ' monatlich' : ' jährlich'}.
          Du kannst dein Abonnement jederzeit kündigen.
        </p>
      </div>
    </div>
  );
} 
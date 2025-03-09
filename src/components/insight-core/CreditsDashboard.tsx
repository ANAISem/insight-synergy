'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { insightCoreApi, UserCredits } from '@/lib/api/insightCore';
import { stripeApi, CreditPackage } from '@/lib/api/stripe';
import { useToast } from "@/components/ui/use-toast";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('de-DE').format(num);
};

export function CreditsDashboard() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<string | null>(null);
  const { toast } = useToast();

  // Lade die Credits-Informationen mit verbessertem Error-Handling
  const loadCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userCredits = await insightCoreApi.getUserCredits();
      setCredits(userCredits);
    } catch (err: any) {
      console.error('Fehler beim Laden der Credits-Informationen:', err);
      setError(
        err.message || 'Die Credits-Informationen konnten nicht geladen werden. Bitte versuche es später erneut.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Lade die verfügbaren Kredit-Pakete
  const loadPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const availablePackages = await stripeApi.getAvailableCreditPackages();
      setPackages(availablePackages);
    } catch (err) {
      console.error('Fehler beim Laden der Kredit-Pakete:', err);
      // Hier verwenden wir Standard-Pakete als Fallback
      setPackages([
        {
          id: 'credit-100',
          name: '100 Credits',
          description: 'Kleines Paket für gelegentliche Nutzung',
          creditsAmount: 100,
          price: 4.99,
          currency: 'EUR'
        },
        {
          id: 'credit-500',
          name: '500 Credits',
          description: 'Mittleres Paket für regelmäßige Nutzung',
          creditsAmount: 500,
          price: 19.99,
          currency: 'EUR',
          popular: true
        },
        {
          id: 'credit-1000',
          name: '1000 Credits',
          description: 'Großes Paket für intensive Nutzung',
          creditsAmount: 1000,
          price: 34.99,
          currency: 'EUR'
        }
      ]);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  // Lade die Daten beim Laden der Komponente
  useEffect(() => {
    loadCredits();
    loadPackages();
  }, [loadCredits, loadPackages]);

  // Aktualisiere die Daten manuell
  const handleRefresh = useCallback(() => {
    loadCredits();
    toast({
      title: "Aktualisiert",
      description: "Die Credits-Informationen wurden aktualisiert.",
    });
  }, [loadCredits, toast]);

  // Optimierte Kauflogik mit verbesserten Fehlerbehandlung
  const handlePurchase = useCallback(async (packageId: string) => {
    if (activePurchase) return;
    
    try {
      setActivePurchase(packageId);
      
      // Erstelle eine Checkout-Session
      const checkoutResult = await stripeApi.createCreditCheckoutSession(packageId);
      
      if (checkoutResult.checkoutUrl) {
        // Leite zum Stripe Checkout weiter
        window.location.href = checkoutResult.checkoutUrl;
      } else {
        throw new Error('Keine Checkout-URL erhalten');
      }
    } catch (err: any) {
      console.error('Fehler beim Kauf der Credits:', err);
      toast({
        variant: "destructive",
        title: "Kauf fehlgeschlagen",
        description: err.message || "Beim Kauf der Credits ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
      });
      setActivePurchase(null);
    }
  }, [activePurchase, toast]);

  // Memoize die Paket-Komponenten für bessere Performance
  const packageComponents = useMemo(() => {
    return packages.map((pkg) => (
      <PurchaseOption
        key={pkg.id}
        id={pkg.id}
        amount={pkg.creditsAmount}
        price={pkg.price}
        currency={pkg.currency}
        popular={pkg.popular}
        onPurchase={handlePurchase}
        loading={activePurchase === pkg.id}
      />
    ));
  }, [packages, handlePurchase, activePurchase]);

  // Zeige Lade-Skeleton während des Ladens
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Zeige Fehlermeldung bei Fehlern
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Fehler beim Laden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={loadCredits}>Erneut versuchen</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback für fehlende Daten
  if (!credits) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <h3 className="mb-2 text-lg font-medium">Keine Credits-Informationen verfügbar</h3>
        <p className="text-muted-foreground">
          Deine Credits-Informationen konnten nicht geladen werden. Bitte versuche es später erneut.
        </p>
        <Button onClick={loadCredits} className="mt-4">Erneut versuchen</Button>
      </div>
    );
  }

  const { available, used, subscription, transactions } = credits;
  const percentage = Math.min(
    100,
    Math.round((available / (available + used.total || 1)) * 100) || 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Credits & Nutzung</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Aktualisieren
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Credit Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Verfügbare Credits
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{formatNumber(available)}</div>
              <p className="text-xs text-muted-foreground">
                von {formatNumber(available + used.total)} insgesamt
              </p>
              <Progress value={percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Daily Usage Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Heutige Nutzung
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(used.today)}</div>
            <p className="text-xs text-muted-foreground">
              {subscription.freeCreditsPerDay > 0
                ? `${formatNumber(subscription.freeCreditsPerDay)} Gratis-Credits pro Tag`
                : 'Keine Gratis-Credits'}
            </p>
            {used.today > 0 && subscription.freeCreditsPerDay > 0 && (
              <div className="mt-2">
                <Progress 
                  value={(used.today / subscription.freeCreditsPerDay) * 100} 
                  className="h-2"
                />
                <div className="mt-1 flex items-center">
                  <ArrowUpRight className="mr-1 h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">
                    {Math.min(100, Math.round((used.today / subscription.freeCreditsPerDay) * 100))}% der täglichen Gratis-Credits
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Plan Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Abo-Plan
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription.plan}</div>
            {subscription.renewalDate && (
              <p className="text-xs text-muted-foreground">
                Verlängerung am {new Date(subscription.renewalDate).toLocaleDateString('de-DE')}
              </p>
            )}
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Aktiv
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage Trend Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nutzungstrend
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(used.thisWeek)}</div>
            <p className="text-xs text-muted-foreground">
              Diese Woche
            </p>
            {used.thisWeek > 0 && used.thisMonth > 0 && (
              <div className="mt-2">
                <Progress 
                  value={(used.thisWeek / (Math.max(used.thisMonth / 4, 1))) * 100} 
                  className="h-2"
                />
                <div className="mt-1 flex items-center">
                  {used.thisWeek / (used.thisMonth / 4) > 1 ? (
                    <>
                      <ArrowUpRight className="mr-1 h-4 w-4 text-destructive" />
                      <span className="text-xs text-destructive">
                        {Math.round((used.thisWeek / (used.thisMonth / 4) - 1) * 100)}% über Durchschnitt
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="mr-1 h-4 w-4 text-green-700" />
                      <span className="text-xs text-green-700">
                        {Math.round((1 - used.thisWeek / (used.thisMonth / 4)) * 100)}% unter Durchschnitt
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
          <TabsTrigger value="purchase">Credits kaufen</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Letzte Transaktionen</CardTitle>
              <CardDescription>
                Eine Übersicht über deine Credit-Transaktionen.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-8">
                <div className="overflow-x-auto px-6">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Datum</th>
                        <th className="pb-2 font-medium">Beschreibung</th>
                        <th className="pb-2 font-medium">Typ</th>
                        <th className="pb-2 text-right font-medium">Menge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions && transactions.length > 0 ? (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b last:border-0">
                            <td className="py-3 text-sm">
                              {new Date(transaction.timestamp).toLocaleDateString('de-DE')}
                            </td>
                            <td className="py-3 text-sm">{transaction.description}</td>
                            <td className="py-3 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  transaction.type === 'usage'
                                    ? 'bg-red-100 text-red-800'
                                    : transaction.type === 'purchase'
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.type === 'refund'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {transaction.type === 'usage'
                                  ? 'Nutzung'
                                  : transaction.type === 'purchase'
                                  ? 'Kauf'
                                  : transaction.type === 'refund'
                                  ? 'Erstattung'
                                  : transaction.type === 'free'
                                  ? 'Gratis'
                                  : transaction.type === 'subscription'
                                  ? 'Abo'
                                  : 'Bonus'}
                              </span>
                            </td>
                            <td className={`py-3 text-right text-sm ${
                              transaction.type === 'usage' ? 'text-destructive' : 'text-green-700'
                            }`}>
                              {transaction.type === 'usage' ? '-' : '+'}
                              {formatNumber(transaction.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                            Keine Transaktionen gefunden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="purchase" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credits kaufen</CardTitle>
              <CardDescription>
                Kaufe zusätzliche Credits für dein Konto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {loadingPackages ? (
                  // Skeleton für das Laden der Pakete
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))
                ) : (
                  // Memoized Package-Komponenten
                  packageComponents
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-xs text-muted-foreground">
                * Alle Preise verstehen sich inklusive Mehrwertsteuer. Credits verfallen nicht und können 
                unbegrenzt genutzt werden.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PurchaseOptionProps {
  id: string;
  amount: number;
  price: number;
  currency: string;
  popular?: boolean;
  onPurchase: (id: string) => void;
  loading: boolean;
}

// Optimierte Komponente für Kaufoptionen
const PurchaseOption = React.memo(function PurchaseOption({ 
  id, 
  amount, 
  price, 
  currency, 
  popular, 
  onPurchase, 
  loading 
}: PurchaseOptionProps) {
  const formatCurrency = (value: number, currency: string): string => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: currency 
    }).format(value);
  };
  
  const formattedPrice = formatCurrency(price, currency);
  const pricePerCredit = formatCurrency(price / amount, currency);
  
  return (
    <div 
      className={`rounded-lg border p-4 transition-all hover:shadow-md ${
        popular ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/30'
      }`}
    >
      {popular && (
        <div className="mb-2 text-center">
          <span className="inline-block rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
            Am beliebtesten
          </span>
        </div>
      )}
      <div className="text-center">
        <h3 className="text-lg font-medium">{formatNumber(amount)} Credits</h3>
        <p className="mt-1 text-3xl font-bold">{formattedPrice}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {pricePerCredit} pro Credit
        </p>
      </div>
      <div className="mt-4">
        <Button 
          className="w-full" 
          onClick={() => onPurchase(id)} 
          disabled={loading}
          variant={popular ? "default" : "outline"}
        >
          {loading ? "Wird bearbeitet..." : "Jetzt kaufen"}
        </Button>
      </div>
    </div>
  );
}); 
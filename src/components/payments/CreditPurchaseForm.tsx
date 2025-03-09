'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  CheckCircle2, 
  PackageCheck, 
  Calendar, 
  ArrowRight, 
  Loader2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  stripeClient, 
  CreditPackage, 
  DEFAULT_CREDIT_PACKAGES 
} from '@/lib/stripe/stripeClient';

interface CreditPurchaseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  customPackages?: CreditPackage[];
}

export function CreditPurchaseForm({ 
  onSuccess, 
  onCancel,
  customPackages
}: CreditPurchaseFormProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'onetime' | 'subscription'>('onetime');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Verwende benutzerdefinierte Pakete oder Standard-Pakete
  const creditPackages = customPackages || DEFAULT_CREDIT_PACKAGES;
  
  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast({
        variant: "destructive",
        title: "Kein Paket ausgewählt",
        description: "Bitte wähle ein Credit-Paket aus."
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Überprüfe, ob Stripe verfügbar ist
      const isStripeAvailable = await stripeClient.isAvailable();
      
      if (!isStripeAvailable) {
        throw new Error("Stripe-Integration ist nicht verfügbar.");
      }
      
      if (selectedTab === 'onetime') {
        // Einmaliger Kauf
        await stripeClient.redirectToCheckout(selectedPackage);
      } else {
        // Abonnement erstellen
        const session = await stripeClient.createSubscription(selectedPackage);
        
        // Weiterleitung zur Abonnement-Seite
        window.location.href = session.url;
      }
      
      // Bei Erfolg (falls keine Weiterleitung erfolgt)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Fehler bei der Zahlungsverarbeitung:', error);
      
      toast({
        variant: "destructive",
        title: "Fehler bei der Zahlungsverarbeitung",
        description: error.message || "Bei der Verarbeitung der Zahlung ist ein Fehler aufgetreten. Bitte versuche es später erneut."
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Credits kaufen</CardTitle>
        <CardDescription>
          Wähle ein Paket, das zu deinen Bedürfnissen passt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="onetime" onValueChange={(value) => setSelectedTab(value as 'onetime' | 'subscription')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="onetime" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> 
              <span>Einmaliger Kauf</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> 
              <span>Monatliches Abo</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="onetime">
            <div className="grid gap-4 md:grid-cols-3">
              {creditPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  creditPackage={pkg}
                  selected={selectedPackage === pkg.id}
                  onSelect={() => setSelectedPackage(pkg.id)}
                  purchaseType="onetime"
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="subscription">
            <div className="grid gap-4 md:grid-cols-3">
              {creditPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  creditPackage={pkg}
                  selected={selectedPackage === pkg.id}
                  onSelect={() => setSelectedPackage(pkg.id)}
                  purchaseType="subscription"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-md border">
          <h4 className="text-sm font-medium flex items-center mb-2">
            <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
            Sichere Zahlung
          </h4>
          <p className="text-xs text-muted-foreground">
            Alle Zahlungen werden sicher über Stripe verarbeitet. Deine Zahlungsinformationen werden niemals auf unseren Servern gespeichert.
            Die Gebühren werden {selectedTab === 'subscription' ? 'monatlich' : 'einmalig'} abgerechnet.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
          Abbrechen
        </Button>
        <Button 
          onClick={handlePurchase} 
          disabled={!selectedPackage || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verarbeitung...
            </>
          ) : (
            <>
              Jetzt kaufen
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PackageCardProps {
  creditPackage: CreditPackage;
  selected: boolean;
  onSelect: () => void;
  purchaseType: 'onetime' | 'subscription';
}

function PackageCard({ creditPackage, selected, onSelect, purchaseType }: PackageCardProps) {
  const { id, name, credits, price, currency, popular, savings, features } = creditPackage;
  
  // Berechne den Preis pro Credit
  const pricePerCredit = price / credits;
  
  // Angepasste Beschreibung je nach Kauftyp
  const description = purchaseType === 'subscription'
    ? `${credits} Credits pro Monat`
    : `${credits} Credits einmalig`;
  
  return (
    <div 
      className={`
        relative rounded-lg border p-4 cursor-pointer transition-all
        ${selected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}
        ${popular ? 'shadow-md' : ''}
      `}
      onClick={onSelect}
    >
      {popular && (
        <div className="absolute -top-3 left-0 right-0 flex justify-center">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Beliebteste Wahl
          </span>
        </div>
      )}
      
      <div className="mt-2 text-center">
        <h3 className="text-lg font-medium">{name}</h3>
        <div className="mt-1 space-y-1">
          <p className="text-3xl font-bold">
            {price.toFixed(2)} {currency}
            <span className="text-xs text-muted-foreground font-normal">
              {purchaseType === 'subscription' ? '/Monat' : ''}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {savings && (
            <p className="text-xs text-green-600 font-medium">
              {savings}% Ersparnis
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            ({(pricePerCredit * 100).toFixed(2)} Cent pro Credit)
          </p>
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Features:</h4>
        <ul className="space-y-1">
          {features?.map((feature, index) => (
            <li key={index} className="text-xs flex items-start">
              <CheckCircle2 className="mr-1 h-3 w-3 text-green-500 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <Button
          variant={selected ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={onSelect}
        >
          {selected ? (
            <>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Ausgewählt
            </>
          ) : (
            <>
              <Zap className="mr-1 h-4 w-4" />
              Auswählen
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 
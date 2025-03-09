/**
 * Server-seitiges Kreditsystem für Insight Synergy
 * 
 * Funktionen zur Verwaltung und Abrechnung von Credits.
 * Diese Funktionen laufen ausschließlich auf dem Server und verwalten 
 * die Guthaben der Benutzer und die Transaktionshistorie.
 */

import { createClient } from '@supabase/supabase-js';

// Initialisiere Supabase Admin-Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Service-Role-Key für admin-ähnliche Operationen
  { auth: { persistSession: false } }
);

// Transaktionstypen für Kreditsystem
export type CreditTransactionType = 'usage' | 'purchase' | 'subscription' | 'refund' | 'bonus' | 'free';

/**
 * Aktualisiert den Credit-Stand eines Benutzers
 */
export async function updateUserCredits(
  userId: string, 
  amount: number, 
  type: CreditTransactionType, 
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; balance?: number; error?: string }> {
  try {
    // Prüfe, ob ein gültiger Benutzer übergeben wurde
    if (!userId) {
      return { success: false, error: 'Keine Benutzer-ID angegeben' };
    }
    
    // Prüfe, ob die Menge gültig ist
    if (amount === 0) {
      return { success: false, error: 'Kreditmenge darf nicht 0 sein' };
    }
    
    // Starte eine Transaktion
    const { data, error } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description || getDefaultDescription(amount, type),
      p_metadata: metadata || {}
    });
    
    if (error) {
      console.error('Fehler bei der Credit-Aktualisierung:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, balance: data.new_balance };
  } catch (error) {
    console.error('Unerwarteter Fehler im Kreditsystem:', error);
    return { success: false, error: 'Unerwarteter Fehler im Kreditsystem' };
  }
}

/**
 * Prüft, ob ein Benutzer genügend Credits hat
 */
export async function hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
  try {
    // Hole den aktuellen Credit-Stand des Benutzers
    const { data, error } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Fehler beim Abrufen des Credit-Stands:', error);
      return false;
    }
    
    return (data?.credit_balance || 0) >= amount;
  } catch (error) {
    console.error('Unerwarteter Fehler bei der Creditsprüfung:', error);
    return false;
  }
}

/**
 * Verbrauche Credits für eine Funktionsnutzung
 */
export async function useCredits(
  userId: string, 
  amount: number, 
  feature: string, 
  metadata?: Record<string, any>
): Promise<{ success: boolean; remainingBalance?: number; error?: string }> {
  // Credits können nur verbraucht, nicht hinzugefügt werden
  if (amount <= 0) {
    return { success: false, error: 'Kreditmenge muss positiv sein' };
  }
  
  // Prüfe, ob der Benutzer genügend Credits hat
  const hasCredits = await hasEnoughCredits(userId, amount);
  
  if (!hasCredits) {
    return { success: false, error: 'Nicht genügend Credits' };
  }
  
  // Verbrauche die Credits (negative Menge, da sie abgezogen werden)
  const description = `${amount} Credits für ${feature} verwendet`;
  const result = await updateUserCredits(userId, -amount, 'usage', description, {
    ...metadata,
    feature
  });
  
  if (!result.success) {
    return result;
  }
  
  return { success: true, remainingBalance: result.balance };
}

/**
 * Füge kostenlose (Starter-)Credits hinzu
 */
export async function addFreeCredits(
  userId: string, 
  amount: number, 
  reason: string = 'daily'
): Promise<{ success: boolean; balance?: number; error?: string }> {
  // Freie Credits können nur hinzugefügt, nicht abgezogen werden
  if (amount <= 0) {
    return { success: false, error: 'Kreditmenge muss positiv sein' };
  }
  
  const description = `${amount} kostenlose Credits (${reason})`;
  
  return updateUserCredits(userId, amount, 'free', description, { reason });
}

/**
 * Prüfe, ob ein Benutzer täglich kostenlose Credits erhalten hat
 */
export async function hasReceivedDailyCredits(userId: string): Promise<boolean> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Prüfe, ob heute bereits kostenlose Credits gutgeschrieben wurden
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'free')
      .gte('created_at', today.toISOString())
      .limit(1);
      
    if (error) {
      console.error('Fehler beim Prüfen der täglichen Credits:', error);
      return true; // Im Zweifel annehmen, dass Credits bereits erhalten wurden
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Unerwarteter Fehler bei der Prüfung täglicher Credits:', error);
    return true; // Im Zweifel annehmen, dass Credits bereits erhalten wurden
  }
}

/**
 * Generiert eine Standardbeschreibung basierend auf Menge und Typ
 */
function getDefaultDescription(amount: number, type: CreditTransactionType): string {
  const absAmount = Math.abs(amount);
  
  switch (type) {
    case 'usage':
      return `${absAmount} Credits verwendet`;
    case 'purchase':
      return `${absAmount} Credits gekauft`;
    case 'subscription':
      return `${absAmount} Credits aus Abonnement`;
    case 'refund':
      return `${absAmount} Credits erstattet`;
    case 'bonus':
      return `${absAmount} Bonus-Credits`;
    case 'free':
      return `${absAmount} kostenlose Credits`;
    default:
      return `${absAmount} Credits (${type})`;
  }
}

/**
 * Holt die Transaktionshistorie eines Benutzers
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ transactions: any[]; total: number; error?: string }> {
  try {
    // Hole Transaktionen
    const { data, error, count } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Fehler beim Abrufen der Transaktionen:', error);
      return { transactions: [], total: 0, error: error.message };
    }
    
    return { transactions: data || [], total: count || 0 };
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen der Transaktionen:', error);
    return { transactions: [], total: 0, error: 'Unerwarteter Fehler beim Abrufen der Transaktionen' };
  }
}

/**
 * Holt den aktuellen Credit-Stand eines Benutzers
 */
export async function getUserCreditBalance(userId: string): Promise<{ balance: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // Wenn der Benutzer noch keine Credits hat, gib 0 zurück
      if (error.code === 'PGRST116') { // not found
        return { balance: 0 };
      }
      
      console.error('Fehler beim Abrufen des Credit-Stands:', error);
      return { balance: 0, error: error.message };
    }
    
    return { balance: data?.credit_balance || 0 };
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen des Credit-Stands:', error);
    return { balance: 0, error: 'Unerwarteter Fehler beim Abrufen des Credit-Stands' };
  }
} 
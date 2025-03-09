import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr';
import { createServerClient as createServerSupabaseClient } from '@supabase/ssr';
import { type cookies } from 'next/headers';

// Typen für die Tabellen im Supabase
export type ThinkingModel = {
  id: string;
  name: string;
  description?: string;
  schema: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  owner_id: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  title?: string;
  content: Record<string, any>;
  model_used?: string;
  tokens_used?: number;
  created_at: string;
  updated_at: string;
};

export type ApiUsage = {
  id: string;
  user_id: string;
  endpoint: string;
  tokens_used?: number;
  model_used?: string;
  status?: string;
  cost?: number;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  default_model: string;
  theme: string;
  notification_preferences: Record<string, boolean>;
  api_limits: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type UserCredits = {
  user_id: string;
  available_credits: number;
  lifetime_credits: number;
  last_topped_up?: string;
  created_at: string;
  updated_at: string;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  description?: string;
  transaction_type: string;
  reference_id?: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      thinking_models: {
        Row: ThinkingModel;
        Insert: Omit<ThinkingModel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ThinkingModel, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSession, 'id' | 'created_at' | 'updated_at'>>;
      };
      api_usage: {
        Row: ApiUsage;
        Insert: Omit<ApiUsage, 'id' | 'created_at'>;
        Update: Partial<Omit<ApiUsage, 'id' | 'created_at'>>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSettings, 'created_at' | 'updated_at'>>;
      };
      user_credits: {
        Row: UserCredits;
        Insert: Omit<UserCredits, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserCredits, 'created_at' | 'updated_at'>>;
      };
      credit_transactions: {
        Row: CreditTransaction;
        Insert: Omit<CreditTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<CreditTransaction, 'id' | 'created_at'>>;
      };
    };
  };
};

// Supabase URL und Key aus den Umgebungsvariablen lesen
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-Client für clientseitige Operationen
export const createBrowserClient = () => 
  createBrowserSupabaseClient<Database>({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });

// Server-Client für serverseitige Operationen mit Cookies
export const createServerClient = (cookieStore: ReturnType<typeof cookies>) => 
  createServerSupabaseClient<Database>({
    cookies: () => cookieStore,
  });

// Admin-Client für serverseitige Operationen ohne Benutzerkontext (mit Service-Role)
export const createAdminClient = () => 
  createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  ); 
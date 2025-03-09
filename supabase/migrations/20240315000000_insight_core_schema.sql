-- *** INSIGHT CORE SCHEMA ***
-- Erstelle die erforderlichen Tabellen und Security-Policies für Insight Core

-- Aktiviere UUID-Erweiterung falls noch nicht geschehen
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** 1. THINKING MODELS (DENKMODELLE) ***
CREATE TABLE IF NOT EXISTS thinking_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- *** 2. USER SESSIONS (NUTZERVERLÄUFE) ***
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content JSONB,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- *** 3. API USAGE (API-NUTZUNG) ***
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER,
  model_used TEXT,
  status TEXT,
  cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- *** 4. USER SETTINGS (BENUTZEREINSTELLUNGEN) ***
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_model TEXT DEFAULT 'gpt-o1-mini',
  theme TEXT DEFAULT 'light',
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
  api_limits JSONB DEFAULT '{"daily": 100, "monthly": 2000}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- *** 5. USER CREDITS (BENUTZERGUTHABEN) ***
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_credits INTEGER DEFAULT 0,
  lifetime_credits INTEGER DEFAULT 0,
  last_topped_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- *** 6. CREDIT TRANSACTIONS (GUTHABENTRANSAKTIONEN) ***
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  description TEXT,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- *** ROW LEVEL SECURITY (RLS) POLICIES ***

-- Aktiviere RLS für alle Tabellen
ALTER TABLE thinking_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- THINKING MODELS POLICIES
CREATE POLICY "Benutzer können öffentliche Modelle und ihre eigenen Modelle sehen"
  ON thinking_models
  FOR SELECT
  USING (is_public OR owner_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Modelle einfügen"
  ON thinking_models
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Modelle aktualisieren"
  ON thinking_models
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Modelle löschen"
  ON thinking_models
  FOR DELETE
  USING (owner_id = auth.uid());

-- USER SESSIONS POLICIES
CREATE POLICY "Benutzer können nur ihre eigenen Sitzungen sehen"
  ON user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Sitzungen einfügen"
  ON user_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Sitzungen aktualisieren"
  ON user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Sitzungen löschen"
  ON user_sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- API USAGE POLICIES
CREATE POLICY "Benutzer können nur ihre eigene API-Nutzung sehen"
  ON api_usage
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Nur System kann API-Nutzung einfügen"
  ON api_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- USER SETTINGS POLICIES
CREATE POLICY "Benutzer können nur ihre eigenen Einstellungen sehen"
  ON user_settings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Benutzer können nur ihre eigenen Einstellungen einfügen/aktualisieren"
  ON user_settings
  FOR ALL
  USING (user_id = auth.uid());

-- USER CREDITS POLICIES
CREATE POLICY "Benutzer können nur ihr eigenes Guthaben sehen"
  ON user_credits
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Nur System kann Guthaben verwalten"
  ON user_credits
  FOR ALL
  USING (auth.uid() = user_id);

-- CREDIT TRANSACTIONS POLICIES
CREATE POLICY "Benutzer können nur ihre eigenen Transaktionen sehen"
  ON credit_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Nur System kann Transaktionen einfügen"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- *** TRIGGER FÜR NEUE BENUTZER ***

-- Automatisch Einstellungen und Guthaben erstellen, wenn ein neuer Benutzer registriert wird
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Erstelle Standard-Einstellungen für den Benutzer
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  -- Erstelle Guthaben für den Benutzer (Startwert: 100 Credits)
  INSERT INTO public.user_credits (user_id, available_credits, lifetime_credits)
  VALUES (NEW.id, 100, 100);
  
  -- Protokolliere die Startgutschrift
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Willkommensbonus für neue Benutzer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für das Erstellen von Benutzereinstellungen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 
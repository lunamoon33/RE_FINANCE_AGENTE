-- Este script crea todas las tablas necesarias para tu bot en Supabase.
-- Cópialo y pégalo en el "SQL Editor" de tu Dashboard de Supabase y ejecútalo (Run).

-- 1. Tabla de Usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  wallet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Sesiones (Entrevistas)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER,
  publish_decision BOOLEAN,
  testnet_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Mensajes (Historial del Agente)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- (Opcional) Índices para hacer las búsquedas más rápidas en el futuro
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_sessions_thread_id ON sessions(thread_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);

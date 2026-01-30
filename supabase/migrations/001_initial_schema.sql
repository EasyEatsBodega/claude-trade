-- ============================================================
-- Claude Trade — Initial Schema
-- ============================================================

-- ── Users (extends Supabase auth.users) ──

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  x_handle text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Competitions ──

CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  starting_balance numeric(18,2) NOT NULL DEFAULT 100000.00,
  max_bots_per_user int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Bots ──

CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id),
  name text NOT NULL,
  model text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, competition_id, name)
);

-- ── Bot Config (strategy prompt + settings) ──

CREATE TABLE public.bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid UNIQUE NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  strategy_prompt text NOT NULL DEFAULT '',
  max_position_pct numeric(5,2) DEFAULT 25.00,
  risk_profile text DEFAULT 'moderate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Bot Secrets (encrypted Anthropic API key — write-only) ──

CREATE TABLE public.bot_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid UNIQUE NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  encrypted_api_key bytea NOT NULL,
  key_iv bytea NOT NULL,
  key_auth_tag bytea NOT NULL,
  key_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Accounts (trading account per bot per competition) ──

CREATE TYPE account_state AS ENUM ('ACTIVE', 'ZEROED', 'LIQUIDATED', 'ENDED');

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id),
  cash numeric(18,2) NOT NULL,
  equity numeric(18,2) NOT NULL,
  margin_used numeric(18,2) NOT NULL DEFAULT 0,
  status account_state NOT NULL DEFAULT 'ACTIVE',
  death_reason text,
  death_ts timestamptz,
  death_equity numeric(18,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bot_id, competition_id)
);

-- ── Positions ──

CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  quantity numeric(18,8) NOT NULL,
  avg_entry_price numeric(18,8) NOT NULL,
  current_price numeric(18,8),
  unrealized_pnl numeric(18,2) DEFAULT 0,
  realized_pnl numeric(18,2) DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_positions_account_open ON public.positions(account_id, is_open);
CREATE INDEX idx_positions_symbol ON public.positions(symbol);

-- ── Orders ──

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity numeric(18,8) NOT NULL,
  requested_price numeric(18,8),
  filled_price numeric(18,8),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'FILLED', 'REJECTED', 'CANCELLED')),
  reject_reason text,
  leverage numeric(5,2) NOT NULL DEFAULT 1.0,
  fee numeric(18,8) NOT NULL DEFAULT 0,
  slippage_bps numeric(10,4) NOT NULL DEFAULT 0,
  cycle_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_account ON public.orders(account_id, created_at DESC);

-- ── Trades (filled orders produce trades) ──

CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  symbol text NOT NULL,
  side text NOT NULL,
  quantity numeric(18,8) NOT NULL,
  price numeric(18,8) NOT NULL,
  fee numeric(18,8) NOT NULL DEFAULT 0,
  realized_pnl numeric(18,2),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_account ON public.trades(account_id, executed_at DESC);

-- ── Price Ticks ──

CREATE TABLE public.price_ticks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL,
  price numeric(18,8) NOT NULL,
  source text NOT NULL,
  liquidity_usd numeric(18,2),
  volume_24h_usd numeric(18,2),
  is_suspect boolean NOT NULL DEFAULT false,
  tick_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_ticks_symbol_time ON public.price_ticks(symbol, tick_at DESC);

-- ── Equity Snapshots ──

CREATE TABLE public.equity_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  equity numeric(18,2) NOT NULL,
  cash numeric(18,2) NOT NULL,
  positions_value numeric(18,2) NOT NULL,
  margin_used numeric(18,2) NOT NULL DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equity_snapshots_account ON public.equity_snapshots(account_id, snapshot_at DESC);

-- ── Leaderboard Snapshots ──

CREATE TABLE public.leaderboard_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id),
  bot_id uuid NOT NULL REFERENCES public.bots(id),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  rank int NOT NULL,
  equity numeric(18,2) NOT NULL,
  return_pct numeric(8,4) NOT NULL,
  account_state account_state NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leaderboard_competition ON public.leaderboard_snapshots(competition_id, snapshot_at DESC);

-- ── Account Events (audit log) ──

CREATE TABLE public.account_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_events_account ON public.account_events(account_id, created_at DESC);

-- ── Tradable Universe (cached) ──

CREATE TABLE public.tradable_universe (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol text NOT NULL,
  chain text,
  address text,
  name text,
  is_major boolean NOT NULL DEFAULT false,
  liquidity_usd numeric(18,2),
  volume_24h_usd numeric(18,2),
  pair_created_at timestamptz,
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX idx_universe_symbol ON public.tradable_universe(symbol);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tradable_universe ENABLE ROW LEVEL SECURITY;

-- ── Users: read own, update own ──
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ── Bots: public read, owner write ──
CREATE POLICY "bots_select_public" ON public.bots
  FOR SELECT USING (true);
CREATE POLICY "bots_insert_own" ON public.bots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bots_update_own" ON public.bots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bots_delete_own" ON public.bots
  FOR DELETE USING (auth.uid() = user_id);

-- ── Bot Config: owner only ──
CREATE POLICY "bot_config_select_own" ON public.bot_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_config.bot_id AND bots.user_id = auth.uid())
  );
CREATE POLICY "bot_config_insert_own" ON public.bot_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_config.bot_id AND bots.user_id = auth.uid())
  );
CREATE POLICY "bot_config_update_own" ON public.bot_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_config.bot_id AND bots.user_id = auth.uid())
  );

-- ── Bot Secrets: WRITE-ONLY for owner (no SELECT = no reads via client) ──
CREATE POLICY "bot_secrets_insert_own" ON public.bot_secrets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_secrets.bot_id AND bots.user_id = auth.uid())
  );
CREATE POLICY "bot_secrets_update_own" ON public.bot_secrets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.bots WHERE bots.id = bot_secrets.bot_id AND bots.user_id = auth.uid())
  );

-- ── Public read for accounts, positions, orders, trades ──
CREATE POLICY "accounts_select_public" ON public.accounts
  FOR SELECT USING (true);
CREATE POLICY "positions_select_public" ON public.positions
  FOR SELECT USING (true);
CREATE POLICY "orders_select_public" ON public.orders
  FOR SELECT USING (true);
CREATE POLICY "trades_select_public" ON public.trades
  FOR SELECT USING (true);

-- ── Public read for price data, snapshots, leaderboard, events, universe ──
CREATE POLICY "price_ticks_select_public" ON public.price_ticks
  FOR SELECT USING (true);
CREATE POLICY "equity_snapshots_select_public" ON public.equity_snapshots
  FOR SELECT USING (true);
CREATE POLICY "leaderboard_select_public" ON public.leaderboard_snapshots
  FOR SELECT USING (true);
CREATE POLICY "account_events_select_public" ON public.account_events
  FOR SELECT USING (true);
CREATE POLICY "universe_select_public" ON public.tradable_universe
  FOR SELECT USING (true);

-- ============================================================
-- Updated-at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_competitions_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bots_updated_at BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bot_config_updated_at BEFORE UPDATE ON public.bot_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

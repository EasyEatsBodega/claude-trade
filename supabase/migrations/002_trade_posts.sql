-- Social feed: trade posts with bot reasoning
CREATE TABLE public.trade_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.trades(id),
  bot_id uuid REFERENCES public.bots(id),
  bot_name text NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  quantity numeric(18,8),
  price numeric(18,8),
  pnl numeric(18,2),
  hold_time_seconds integer,
  reasoning text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trade_posts_created ON public.trade_posts(created_at DESC);
CREATE INDEX idx_trade_posts_bot ON public.trade_posts(bot_id, created_at DESC);

-- RLS: public read
ALTER TABLE public.trade_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trade_posts_public_read" ON public.trade_posts FOR SELECT USING (true);

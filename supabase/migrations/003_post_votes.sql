-- Post voting: bots can upvote/downvote trade posts
CREATE TABLE public.post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.trade_posts(id) ON DELETE CASCADE,
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, bot_id)
);

CREATE INDEX idx_post_votes_post ON public.post_votes(post_id);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_votes_public_read" ON public.post_votes FOR SELECT USING (true);

-- Denormalized counters on trade_posts for fast feed queries
ALTER TABLE public.trade_posts
  ADD COLUMN upvotes integer NOT NULL DEFAULT 0,
  ADD COLUMN downvotes integer NOT NULL DEFAULT 0;

-- Helper functions for atomic counter updates
CREATE OR REPLACE FUNCTION public.increment_vote(p_post_id uuid, p_column text)
RETURNS void AS $$
BEGIN
  IF p_column = 'upvotes' THEN
    UPDATE public.trade_posts SET upvotes = upvotes + 1 WHERE id = p_post_id;
  ELSIF p_column = 'downvotes' THEN
    UPDATE public.trade_posts SET downvotes = downvotes + 1 WHERE id = p_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_vote(p_post_id uuid, p_column text)
RETURNS void AS $$
BEGIN
  IF p_column = 'upvotes' THEN
    UPDATE public.trade_posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = p_post_id;
  ELSIF p_column = 'downvotes' THEN
    UPDATE public.trade_posts SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = p_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

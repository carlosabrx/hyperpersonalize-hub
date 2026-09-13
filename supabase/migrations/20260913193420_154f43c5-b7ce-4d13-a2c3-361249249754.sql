CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  total_spend numeric NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  tenure_days integer NOT NULL DEFAULT 0,
  top_category text NOT NULL,
  loyalty_tier text NOT NULL,
  last_surface text NOT NULL,
  sessions_30d integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customers TO anon;
GRANT SELECT ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers are public sample data" ON public.customers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.brand_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  rule text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brand_rules TO anon;
GRANT SELECT ON public.brand_rules TO authenticated;
GRANT ALL ON public.brand_rules TO service_role;
ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand rules are public" ON public.brand_rules FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  surface text NOT NULL,
  headline text NOT NULL,
  body text NOT NULL,
  cta text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  past_lift numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assets TO anon;
GRANT SELECT ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets are public" ON public.assets FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.past_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  surface text NOT NULL,
  audience_summary text NOT NULL,
  winner text NOT NULL,
  lift numeric NOT NULL,
  metric text NOT NULL,
  notes text NOT NULL,
  ran_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.past_experiments TO anon;
GRANT SELECT ON public.past_experiments TO authenticated;
GRANT ALL ON public.past_experiments TO service_role;
ALTER TABLE public.past_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "past experiments are public" ON public.past_experiments FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL,
  surface text NOT NULL DEFAULT 'account',
  status text NOT NULL DEFAULT 'drafting',
  audience jsonb,
  variants jsonb,
  experiment jsonb,
  results jsonb,
  reasoning text,
  approval_note text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.runs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.runs TO authenticated;
GRANT ALL ON public.runs TO service_role;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo runs are readable" ON public.runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo runs can be created" ON public.runs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "demo runs can be updated" ON public.runs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  in_audience boolean NOT NULL DEFAULT false,
  in_holdout boolean NOT NULL DEFAULT false,
  reasons jsonb NOT NULL DEFAULT '[]',
  latency_ms numeric NOT NULL DEFAULT 0,
  precomputed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.decisions TO anon;
GRANT SELECT, INSERT ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions are readable" ON public.decisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "decisions can be created" ON public.decisions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX decisions_run_idx ON public.decisions(run_id, created_at DESC);
CREATE INDEX customers_spend_idx ON public.customers(total_spend DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER runs_touch_updated_at BEFORE UPDATE ON public.runs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- seed: brand rules ----------
INSERT INTO public.brand_rules (category, rule) VALUES
('Voice', 'Plain, warm, direct. Second person. No exclamation marks, no hype words like "amazing" or "unbeatable".'),
('Voice', 'Never invent discounts, deadlines or stock levels. Only reference offers that exist in the offer catalogue.'),
('Claims', 'Free shipping may only be mentioned for orders over $50 — that is the real threshold.'),
('Claims', 'Loyalty points are earned at 1 point per dollar. Never state a different rate.'),
('Layout', 'One primary call to action per surface. Secondary actions are text links, never a second filled button.'),
('Layout', 'Headlines cap at 48 characters so they do not wrap on mobile.'),
('Typography', 'Headlines in the display serif, body copy in the sans. Never all-caps body copy.'),
('Colour', 'Ink and clay are the base. Ember is reserved for the primary action and nothing else.');

-- ---------- seed: assets ----------
INSERT INTO public.assets (name, surface, headline, body, cta, tags, past_lift) VALUES
('Loyalty upsell — account, Q1 winner', 'account', 'You have points waiting', 'You are 240 points from your next reward. Every dollar earns one point.', 'See my rewards', ARRAY['loyalty','high-spend','account'], 12.4),
('Loyalty enrol — soft', 'account', 'Start earning on this order', 'Join the programme and earn a point for every dollar you spend, starting today.', 'Join the programme', ARRAY['loyalty','new','account'], 4.1),
('Free shipping nudge', 'cart', 'Add $12 for free shipping', 'Orders over $50 ship free. You are close.', 'Keep shopping', ARRAY['shipping','cart','mid-funnel'], 8.7),
('Comparison for researchers', 'product', 'Not sure which one fits?', 'Compare the three most-bought models side by side, in plain language.', 'Compare models', ARRAY['high-intent','product','comparison'], 15.2),
('Restock reassurance', 'product', 'Back in stock, in your size', 'The size you looked at last week is available again.', 'View the item', ARRAY['returning','product'], 6.9),
('Category re-entry', 'home', 'Pick up where you left off', 'The pieces you were browsing are still here, with what is new alongside them.', 'Continue browsing', ARRAY['returning','home'], 3.8),
('Tier progress', 'account', 'One order from Gold', 'Gold members get early access to new arrivals and free returns.', 'See Gold benefits', ARRAY['loyalty','tier','account'], 11.1),
('Lapsed win-back', 'home', 'It has been a while', 'Here is what has changed in the categories you used to shop.', 'See what is new', ARRAY['lapsed','home'], 2.2),
('Bundle for repeat buyers', 'product', 'Buy the set, save the trip', 'People who bought this usually add these two within a month.', 'View the set', ARRAY['repeat','product','bundle'], 9.4),
('Plain control', 'account', 'Your account', 'Manage orders, addresses and payment methods.', 'View orders', ARRAY['control','account'], 0);

-- ---------- seed: past experiments ----------
INSERT INTO public.past_experiments (name, surface, audience_summary, winner, lift, metric, notes, ran_at) VALUES
('Loyalty upsell on account page', 'account', 'High-spend repeat buyers, 4+ orders', 'Points-waiting variant', 12.4, 'loyalty signup rate', 'Progress framing beat benefit framing. Specific point counts outperformed vague "rewards".', '2026-02-11'),
('Comparison module for high intent', 'product', 'Visitors with 3+ product views in session, no purchase', 'Comparison variant', 15.2, 'add to cart rate', 'Biggest win of the quarter. Only held for first-time visitors; repeat buyers were flat.', '2026-03-04'),
('Free shipping threshold nudge', 'cart', 'Carts between $30 and $50', 'Dollars-remaining variant', 8.7, 'checkout rate', 'Naming the exact gap beat a generic "spend more, ship free".', '2026-01-22'),
('Lapsed win-back on home', 'home', 'No session in 90 days', 'What-is-new variant', 2.2, 'session depth', 'Barely significant. Discount-free win-back is weak on home; better suited to email.', '2026-02-27'),
('Tier progress vs generic benefits', 'account', 'Silver members with 2+ orders', 'One-order-from-Gold variant', 11.1, 'incremental order rate', 'Proximity to a threshold is the strongest lever we have found on the account page.', '2026-04-15'),
('Bundle module for repeat buyers', 'product', 'Repeat buyers, 2+ orders in category', 'Set variant', 9.4, 'units per order', 'Worked on consumables, flat on apparel.', '2026-05-06');

-- ---------- seed: 500 customers ----------
INSERT INTO public.customers (name, email, total_spend, order_count, tenure_days, top_category, loyalty_tier, last_surface, sessions_30d)
SELECT
  (ARRAY['Ana','Ben','Cara','Dev','Elena','Femi','Grace','Hugo','Ines','Jonas','Kira','Liam','Maya','Nils','Omar','Priya','Quinn','Rosa','Sam','Tara','Uma','Viktor','Wren','Xiomara','Yusuf','Zara'])[1 + (i * 7) % 26]
    || ' ' ||
  (ARRAY['Alvarez','Boyd','Castro','Duarte','Ellis','Fontaine','Greco','Haddad','Iversen','Jansen','Kowalski','Lund','Moreau','Novak','Okafor','Pereira','Quist','Rossi','Silva','Tanaka','Ueda','Vega','Walsh','Xu','Yates','Zeman'])[1 + (i * 11) % 26],
  'shopper' || i || '@example.com',
  round((15 + ((i * 37) % 2400) * (1 + ((i % 5) * 0.35)))::numeric, 2),
  1 + (i * 3) % 14,
  20 + (i * 29) % 1400,
  (ARRAY['Outerwear','Footwear','Home','Accessories','Skincare','Consumables'])[1 + (i * 13) % 6],
  CASE WHEN (i * 37) % 2400 > 1900 THEN 'Gold' WHEN (i * 37) % 2400 > 1000 THEN 'Silver' WHEN (i * 37) % 2400 > 400 THEN 'Bronze' ELSE 'None' END,
  (ARRAY['account','product','home','cart'])[1 + (i * 17) % 4],
  (i * 5) % 19
FROM generate_series(1, 500) AS s(i);
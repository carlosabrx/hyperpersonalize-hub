import { createClient } from "@supabase/supabase-js";
import type { Customer } from "./personalization";

/** Server-side publishable client. Reads/writes only public demo tables. */
export function serverSupabase() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type BrandRule = { category: string; rule: string };
export type Asset = {
  name: string;
  surface: string;
  headline: string;
  body: string;
  cta: string;
  tags: string[];
  past_lift: number | null;
};
export type PastExperiment = {
  name: string;
  surface: string;
  audience_summary: string;
  winner: string;
  lift: number;
  metric: string;
  notes: string;
  ran_at: string;
};

export async function loadContext(surface: string) {
  const sb = serverSupabase();
  const [rules, assets, history] = await Promise.all([
    sb.from("brand_rules").select("category, rule"),
    sb.from("assets").select("name, surface, headline, body, cta, tags, past_lift"),
    sb
      .from("past_experiments")
      .select("name, surface, audience_summary, winner, lift, metric, notes, ran_at")
      .order("ran_at", { ascending: false }),
  ]);
  const allAssets = (assets.data ?? []) as Asset[];
  return {
    rules: (rules.data ?? []) as BrandRule[],
    assets: allAssets,
    surfaceAssets: allAssets.filter((a) => a.surface === surface),
    history: (history.data ?? []) as PastExperiment[],
  };
}

export async function loadCustomers(): Promise<Customer[]> {
  const sb = serverSupabase();
  const { data } = await sb
    .from("customers")
    .select(
      "id, name, email, total_spend, order_count, tenure_days, top_category, loyalty_tier, last_surface, sessions_30d",
    )
    .limit(1000);
  return (data ?? []) as Customer[];
}

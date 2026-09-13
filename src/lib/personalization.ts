// Client-safe shared types and the deterministic decision logic used by both
// the personalization endpoint and the UI.

export type Customer = {
  id: string;
  name: string;
  email: string;
  total_spend: number;
  order_count: number;
  tenure_days: number;
  top_category: string;
  loyalty_tier: string;
  last_surface: string;
  sessions_30d: number;
};

export type AudienceRules = {
  summary: string;
  min_spend: number | null;
  min_orders: number | null;
  min_tenure_days: number | null;
  max_tenure_days: number | null;
  categories: string[] | null;
  loyalty_tiers: string[] | null;
  min_sessions_30d: number | null;
  reasoning: string;
};

export type Variant = {
  key: string;
  label: string;
  headline: string;
  body: string;
  cta: string;
  reused_asset_name: string | null;
  rationale: string;
  brand_rules_followed: string[];
};

export type VariantSet = {
  reasoning: string;
  variants: Variant[];
};

export type ExperimentConfig = {
  metric: string;
  holdout_pct: number;
  traffic_split: { key: string; pct: number }[];
  min_sample_per_variant: number;
  expected_days: number;
  guardrails: string[];
  reasoning: string;
};

export type ResultRow = {
  key: string;
  label: string;
  visitors: number;
  conversions: number;
  rate: number;
  lift_vs_control: number | null;
  confidence: number;
};

export type RunResults = {
  rows: ResultRow[];
  recommendation: string;
  recommendation_action: string;
  simulated: true;
};

export type Run = {
  id: string;
  goal: string;
  surface: string;
  status: "drafting" | "proposed" | "live" | "changes_requested";
  audience: AudienceRules | null;
  variants: VariantSet | null;
  experiment: ExperimentConfig | null;
  results: RunResults | null;
  reasoning: string | null;
  approval_note: string | null;
  approved_at: string | null;
  sample_progress_pct: number;
  created_at: string;
};

export type RunAction = {
  id: string;
  action: string;
  detail: string;
  actor: "agent" | "human" | "system";
  created_at: string;
};

export const SURFACES = [
  { value: "account", label: "Account page" },
  { value: "product", label: "Product page" },
  { value: "home", label: "Homepage" },
  { value: "cart", label: "Cart" },
] as const;

/** Human-readable rule lines for an audience definition. */
export function describeRules(a: AudienceRules): string[] {
  const out: string[] = [];
  if (a.min_spend != null) out.push(`total_spend >= ${a.min_spend}`);
  if (a.min_orders != null) out.push(`order_count >= ${a.min_orders}`);
  if (a.min_tenure_days != null) out.push(`tenure_days >= ${a.min_tenure_days}`);
  if (a.max_tenure_days != null) out.push(`tenure_days <= ${a.max_tenure_days}`);
  if (a.min_sessions_30d != null) out.push(`sessions_30d >= ${a.min_sessions_30d}`);
  if (a.categories?.length) out.push(`top_category in (${a.categories.join(", ")})`);
  if (a.loyalty_tiers?.length) out.push(`loyalty_tier in (${a.loyalty_tiers.join(", ")})`);
  if (out.length === 0) out.push("all customers (no filter)");
  return out;
}

/** Does this customer qualify, and why / why not. */
export function evaluateAudience(
  c: Customer,
  a: AudienceRules,
): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let matches = true;

  const check = (ok: boolean, pass: string, fail: string) => {
    if (ok) reasons.push(pass);
    else {
      reasons.push(fail);
      matches = false;
    }
  };

  if (a.min_spend != null)
    check(
      c.total_spend >= a.min_spend,
      `spend $${c.total_spend} >= $${a.min_spend}`,
      `spend $${c.total_spend} below $${a.min_spend}`,
    );
  if (a.min_orders != null)
    check(
      c.order_count >= a.min_orders,
      `${c.order_count} orders >= ${a.min_orders}`,
      `${c.order_count} orders below ${a.min_orders}`,
    );
  if (a.min_tenure_days != null)
    check(
      c.tenure_days >= a.min_tenure_days,
      `${c.tenure_days} days since first order >= ${a.min_tenure_days}`,
      `${c.tenure_days} days since first order below ${a.min_tenure_days}`,
    );
  if (a.max_tenure_days != null)
    check(
      c.tenure_days <= a.max_tenure_days,
      `${c.tenure_days} days since first order <= ${a.max_tenure_days}`,
      `${c.tenure_days} days since first order above ${a.max_tenure_days}`,
    );
  if (a.min_sessions_30d != null)
    check(
      c.sessions_30d >= a.min_sessions_30d,
      `${c.sessions_30d} sessions in 30d >= ${a.min_sessions_30d}`,
      `${c.sessions_30d} sessions in 30d below ${a.min_sessions_30d}`,
    );
  if (a.categories?.length)
    check(
      a.categories.includes(c.top_category),
      `top category ${c.top_category} is in scope`,
      `top category ${c.top_category} is out of scope`,
    );
  if (a.loyalty_tiers?.length)
    check(
      a.loyalty_tiers.includes(c.loyalty_tier),
      `loyalty tier ${c.loyalty_tier} is in scope`,
      `loyalty tier ${c.loyalty_tier} is out of scope`,
    );

  if (reasons.length === 0) reasons.push("no audience filter — everyone qualifies");
  return { matches, reasons };
}

/** Stable 0-999 bucket for a customer within a run. */
export function bucket(runId: string, customerId: string): number {
  const s = `${runId}:${customerId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 1000;
}

/** Which variant (or holdout / control) this customer sees. */
export function assign(
  runId: string,
  customerId: string,
  experiment: ExperimentConfig,
): { variantKey: string; inHoldout: boolean; bucketValue: number } {
  const b = bucket(runId, customerId);
  const holdoutCut = Math.round((experiment.holdout_pct / 100) * 1000);
  if (b < holdoutCut) return { variantKey: "holdout", inHoldout: true, bucketValue: b };

  const remaining = 1000 - holdoutCut;
  const offset = b - holdoutCut;
  const total = experiment.traffic_split.reduce((s, v) => s + v.pct, 0) || 100;
  let acc = 0;
  for (const v of experiment.traffic_split) {
    acc += Math.round((v.pct / total) * remaining);
    if (offset < acc) return { variantKey: v.key, inHoldout: false, bucketValue: b };
  }
  const last = experiment.traffic_split[experiment.traffic_split.length - 1];
  return { variantKey: last?.key ?? "control", inHoldout: false, bucketValue: b };
}

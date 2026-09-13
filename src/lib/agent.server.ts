import { generateText, Output } from "ai";
import { z } from "zod";
import { AGENT_MODEL, createLovableAiGatewayProvider } from "./ai-gateway.server";
import { loadContext, type Asset, type BrandRule, type PastExperiment } from "./demo.server";
import type {
  AudienceRules,
  Customer,
  ExperimentConfig,
  ResultRow,
  RunResults,
  VariantSet,
} from "./personalization";
import { bucket } from "./personalization";

function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");
  return createLovableAiGatewayProvider(key)(AGENT_MODEL);
}

const CUSTOMER_SCHEMA = `Each customer row has: total_spend (dollars, 15-6000), order_count (1-14),
tenure_days (days since first order, 20-1420), top_category (Outerwear, Footwear, Home,
Accessories, Skincare, Consumables), loyalty_tier (None, Bronze, Silver, Gold),
sessions_30d (0-18).`;

function contextBlock(ctx: {
  rules: BrandRule[];
  assets: Asset[];
  surfaceAssets: Asset[];
  history: PastExperiment[];
}) {
  return `BRAND RULES (must be followed exactly):
${ctx.rules.map((r) => `- [${r.category}] ${r.rule}`).join("\n")}

APPROVED ASSET LIBRARY (reuse before writing anything new; past_lift is the lift it achieved):
${ctx.assets
  .map(
    (a) =>
      `- "${a.name}" (surface: ${a.surface}, tags: ${a.tags.join("/")}, past_lift: ${a.past_lift ?? "n/a"}%)
  headline: ${a.headline}
  body: ${a.body}
  cta: ${a.cta}`,
  )
  .join("\n")}

PAST EXPERIMENT HISTORY:
${ctx.history
  .map(
    (h) =>
      `- ${h.name} (${h.ran_at}, ${h.surface}): audience ${h.audience_summary}; winner ${h.winner}; ${h.lift}% on ${h.metric}. ${h.notes}`,
  )
  .join("\n")}`;
}

const audienceSchema = z.object({
  summary: z.string(),
  min_spend: z.number().nullish(),
  min_orders: z.number().nullish(),
  min_tenure_days: z.number().nullish(),
  max_tenure_days: z.number().nullish(),
  categories: z.array(z.string()).nullish(),
  loyalty_tiers: z.array(z.string()).nullish(),
  min_sessions_30d: z.number().nullish(),
  reasoning: z.string(),
});

/**
 * Models on this gateway do not enforce JSON schemas, so we ask for JSON, parse it
 * ourselves and normalise field names. That is far more reliable than failing a step
 * because a model renamed one key.
 */
async function jsonCall(system: string, prompt: string): Promise<Record<string, unknown>> {
  const { text } = await generateText({
    model: gateway(),
    system: `${system}\n\nRespond with a single JSON object and nothing else. No markdown fence, no commentary.`,
    prompt,
  });
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The agent did not return a usable answer.");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function num(obj: Record<string, unknown>, keys: string[]): number | null {
  const v = pick(obj, keys);
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null;
}

function strArr(obj: Record<string, unknown>, keys: string[]): string[] | null {
  const v = pick(obj, keys);
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return [v];
  return null;
}

function str(obj: Record<string, unknown>, keys: string[], fallback = ""): string {
  const v = pick(obj, keys);
  return typeof v === "string" ? v : fallback;
}

export async function proposeAudience(goal: string, surface: string): Promise<AudienceRules> {
  const ctx = await loadContext(surface);
  const raw = await jsonCall(
    `You are the audience-building skill of a web personalization agent for a retail brand.
Translate a growth goal into a filter over the existing customer table. Use the smallest set of
conditions that expresses the goal — never add a condition the goal does not imply. Set unused
fields to null. Aim for an audience between roughly 5% and 40% of the base.
${CUSTOMER_SCHEMA}
Use exactly these top-level JSON keys, at the top level and nowhere nested:
"summary" (string), "reasoning" (string), "min_spend" (number or null), "min_orders" (number or
null), "min_tenure_days" (number or null), "max_tenure_days" (number or null), "categories" (array
of category strings or null), "loyalty_tiers" (array of tier strings or null), "min_sessions_30d"
(number or null). Every threshold you mention in the reasoning MUST also appear as its numeric
field — never describe a filter you leave null.
"summary" is one sentence a marketer would recognise. "reasoning" is two or three sentences
explaining the thresholds you chose and what past experiments suggested them.`,
    `Goal: ${goal}\nSurface: ${surface}\n\n${contextBlock(ctx)}`,
  );
  const nested = (raw["rules"] ?? raw["filters"] ?? {}) as Record<string, unknown>;
  const o = { ...nested, ...raw };
  return {
    summary: str(o, ["summary"], goal),
    reasoning: str(o, ["reasoning", "rationale"]),
    min_spend: num(o, ["min_spend", "min_total_spend", "total_spend_min"]),
    min_orders: num(o, ["min_orders", "min_order_count", "order_count_min"]),
    min_tenure_days: num(o, ["min_tenure_days", "tenure_days_min"]),
    max_tenure_days: num(o, ["max_tenure_days", "tenure_days_max"]),
    categories: strArr(o, ["categories", "top_categories", "top_category"]),
    loyalty_tiers: strArr(o, ["loyalty_tiers", "loyalty_tier", "tiers"]),
    min_sessions_30d: num(o, ["min_sessions_30d", "sessions_30d_min", "min_sessions"]),
  };
}

const variantsSchema = z.object({
  reasoning: z.string(),
  variants: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
      reused_asset_name: z.string().nullish(),
      rationale: z.string(),
      brand_rules_followed: z.array(z.string()).nullish(),
    }),
  ),
});

type RawVariant = z.infer<typeof variantsSchema>["variants"][number];

/** Accepts either { variants: [...] } or { control: {...}, b: {...}, c: {...} }. */
function coerceVariantSet(raw: unknown): { reasoning: string; variants: RawVariant[] } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const reasoning = typeof obj["reasoning"] === "string" ? (obj["reasoning"] as string) : "";
  if (Array.isArray(obj["variants"])) {
    return { reasoning, variants: obj["variants"] as RawVariant[] };
  }
  const variants = Object.entries(obj)
    .filter(([k, v]) => k !== "reasoning" && v && typeof v === "object" && "headline" in (v as object))
    .map(([k, v]) => {
      const rv = v as Partial<RawVariant>;
      return {
        ...rv,
        key: rv.key ?? k,
        label: rv.label ?? (k === "control" ? "Control" : `Variant ${k.toUpperCase()}`),
      } as RawVariant;
    });
  if (variants.length === 0) throw new Error("The agent returned no usable variants.");
  return { reasoning, variants };
}

export async function proposeVariants(
  goal: string,
  surface: string,
  audienceSummary: string,
): Promise<VariantSet> {
  const ctx = await loadContext(surface);
  let raw: unknown;
  try {
    const { output } = await generateText({
      model: gateway(),
      output: Output.object({ schema: variantsSchema }),
      system: `You are the content-assembly skill of a web personalization agent.
Produce exactly three variants for the named surface:
1. key "control" — the existing plain experience, taken from the asset library's control asset.
2. key "b" and key "c" — challengers.
Search the approved asset library FIRST. If an existing asset fits, reuse its copy verbatim (or with
a minimal edit) and set reused_asset_name to that asset's name. Only write new copy when nothing
fits, and then set reused_asset_name to null.
Headlines must be 48 characters or fewer. Obey every brand rule. Never invent an offer, discount,
deadline or stock claim. brand_rules_followed lists the specific rules that shaped the copy.
rationale is one sentence tying the variant to past performance.
Return an object with two top-level fields: "reasoning" (a string) and "variants" (an ARRAY of the
three variant objects, each with its own "key" and "label"). Never key the variants by name.`,
      prompt: `Goal: ${goal}\nSurface: ${surface}\nAudience: ${audienceSummary}\n\n${contextBlock(ctx)}`,
    });
    raw = output;
  } catch (err) {
    // Some models return the variants keyed by name instead of as an array. Recover
    // from the raw text rather than failing the whole step.
    const value = (err as { value?: unknown; text?: string }).value;
    const text = (err as { text?: string }).text;
    raw = value ?? (text ? JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) : null);
  }
  const set = coerceVariantSet(raw);
  return {
    reasoning: set.reasoning,
    variants: set.variants.map((v) => ({
      ...v,
      headline: v.headline.slice(0, 48),
      reused_asset_name: v.reused_asset_name ?? null,
      brand_rules_followed: v.brand_rules_followed ?? [],
    })),
  };
}

const experimentSchema = z.object({
  metric: z.string(),
  holdout_pct: z.number(),
  traffic_split: z.array(z.object({ key: z.string(), pct: z.number() })),
  min_sample_per_variant: z.number(),
  expected_days: z.number().nullish(),
  expected_duration_days: z.number().nullish(),
  guardrails: z.array(z.string()).nullish(),
  reasoning: z.string(),
});

export async function proposeExperiment(
  goal: string,
  surface: string,
  audienceSummary: string,
  audienceSize: number,
  variantKeys: string[],
): Promise<ExperimentConfig> {
  const ctx = await loadContext(surface);
  const { output } = await generateText({
    model: gateway(),
    output: Output.object({ schema: experimentSchema }),
    system: `You are the experiment-configuration skill of a web personalization agent.
Choose one primary success metric, a holdout percentage between 5 and 15, an even traffic split
across the given variant keys (percentages summing to 100, excluding the holdout), a minimum sample
per variant that could detect a lift of a few percent, an expected duration in days, and two or three
guardrails (metrics that must not degrade, or conditions that should stop the test).
reasoning explains the sample-size and holdout choices in plain language.`,
    prompt: `Goal: ${goal}\nSurface: ${surface}\nAudience: ${audienceSummary}
Qualifying customers in the base: ${audienceSize}
Variant keys: ${variantKeys.join(", ")}

${contextBlock(ctx)}`,
  });
  const cfg = output;
  return {
    ...cfg,
    expected_days: cfg.expected_days ?? cfg.expected_duration_days ?? 14,
    guardrails: cfg.guardrails ?? [],
    holdout_pct: Math.min(15, Math.max(5, Math.round(cfg.holdout_pct))),
    traffic_split: cfg.traffic_split.filter((v) => variantKeys.includes(v.key)),
  };
}

/* ---------------- simulated results + agent recommendation ---------------- */

function seededRate(runId: string, key: string, base: number, boost: number) {
  const b = bucket(runId, `results:${key}`);
  return base * (0.88 + (b % 240) / 1000) * (1 + boost);
}

function normalCdf(z: number) {
  return 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp((-2 * z * z) / Math.PI)));
}

export async function simulateResults(
  runId: string,
  goal: string,
  variants: VariantSet,
  experiment: ExperimentConfig,
  assets: Asset[],
): Promise<RunResults> {
  const perVariant = Math.max(600, Math.round(experiment.min_sample_per_variant * 1.15));
  const baseRate = 0.045 + (bucket(runId, "base") % 40) / 1000;

  const rows: ResultRow[] = variants.variants.map((v) => {
    const reused = assets.find((a) => a.name === v.reused_asset_name);
    const boost =
      v.key === "control" ? 0 : ((reused?.past_lift ?? 4) / 100) * 0.8 + (bucket(runId, v.key) % 60) / 1000;
    const rate = seededRate(runId, v.key, baseRate, boost);
    const visitors = perVariant + (bucket(runId, `n:${v.key}`) % 180);
    return {
      key: v.key,
      label: v.label,
      visitors,
      conversions: Math.round(visitors * rate),
      rate,
      lift_vs_control: null,
      confidence: 0,
    };
  });

  const control = rows.find((r) => r.key === "control") ?? rows[0];
  if (!control) throw new Error("No variants to analyse");
  for (const r of rows) {
    if (r.key === control.key) continue;
    r.lift_vs_control = ((r.rate - control.rate) / control.rate) * 100;
    const p = (r.conversions + control.conversions) / (r.visitors + control.visitors);
    const se = Math.sqrt(p * (1 - p) * (1 / r.visitors + 1 / control.visitors));
    const z = se > 0 ? (r.rate - control.rate) / se : 0;
    r.confidence = Math.min(0.999, Math.max(0.5, normalCdf(Math.abs(z))));
  }

  const { text } = await generateText({
    model: gateway(),
    system: `You are the campaign-analysis skill of a web personalization agent. Given a readout,
write two short sentences: what the data says, and what you recommend doing next. Be honest about
insufficient confidence. Then, on a final line, write exactly one of:
ACTION: keep testing
ACTION: declare winner
ACTION: reallocate traffic
ACTION: stop test`,
    prompt: `Goal: ${goal}
Primary metric: ${experiment.metric}
Minimum sample per variant: ${experiment.min_sample_per_variant}
Readout:
${rows
  .map(
    (r) =>
      `${r.key} (${r.label}): ${r.visitors} visitors, ${r.conversions} conversions, rate ${(r.rate * 100).toFixed(2)}%, lift ${r.lift_vs_control == null ? "control" : r.lift_vs_control.toFixed(1) + "%"}, confidence ${(r.confidence * 100).toFixed(1)}%`,
  )
  .join("\n")}`,
  });

  const match = text.match(/ACTION:\s*(.+)$/im);
  return {
    rows,
    recommendation: text.replace(/ACTION:\s*.+$/im, "").trim(),
    recommendation_action: (match?.[1] ?? "keep testing").trim(),
    simulated: true,
  };
}

export function pickShowcaseCustomers(all: Customer[]): Customer[] {
  const sorted = [...all].sort((a, b) => b.total_spend - a.total_spend);
  const picks: (Customer | undefined)[] = [
    sorted[0],
    sorted[3],
    sorted[12],
    sorted[40],
    sorted[90],
    sorted[150],
    sorted[220],
    sorted[300],
    sorted[380],
    sorted[440],
    sorted[470],
    sorted[499],
  ];
  return picks.filter((c): c is Customer => Boolean(c));
}

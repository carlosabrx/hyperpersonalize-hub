import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assign,
  evaluateAudience,
  type AudienceRules,
  type Customer,
  type ExperimentConfig,
  type Run,
  type RunAction,
  type VariantSet,
} from "./personalization";

const RUN_COLUMNS =
  "id, goal, surface, status, audience, variants, experiment, results, reasoning, approval_note, approved_at, sample_progress_pct, created_at";

async function recordAction(
  runId: string,
  action: string,
  detail: string,
  actor: RunAction["actor"],
) {
  const { serverSupabase } = await import("./demo.server");
  const sb = serverSupabase();
  const { error } = await sb.from("run_actions").insert({
    run_id: runId,
    action,
    detail,
    actor,
  });
  if (error) throw new Error(error.message);
}

export const createRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ goal: z.string().min(8).max(400), surface: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const { data: row, error } = await serverSupabase()
      .from("runs")
      .insert({ goal: data.goal.trim(), surface: data.surface, status: "drafting" })
      .select(RUN_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    await recordAction(
      (row as Run).id,
      "Goal submitted",
      "Created this personalization run from a reviewer-supplied goal.",
      "human",
    );
    return row as Run;
  });

export const getRun = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const { data: row, error } = await serverSupabase()
      .from("runs")
      .select(RUN_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as Run | null;
  });

export const listRuns = createServerFn({ method: "GET" }).handler(async () => {
  const { serverSupabase } = await import("./demo.server");
  const { data } = await serverSupabase()
    .from("runs")
    .select("id, goal, surface, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  return (data ?? []) as Pick<Run, "id" | "goal" | "surface" | "status" | "created_at">[];
});

/** Runs the next missing step of the agent workflow and returns the updated run. */
export const advanceRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { serverSupabase, loadCustomers } = await import("./demo.server");
    const agent = await import("./agent.server");
    const sb = serverSupabase();

    const { data: row } = await sb.from("runs").select(RUN_COLUMNS).eq("id", data.id).single();
    const run = row as Run;
    if (!run) throw new Error("Run not found");

    if (!run.audience) {
      const audience = await agent.proposeAudience(run.goal, run.surface);
      const { data: next } = await sb
        .from("runs")
        .update({ audience })
        .eq("id", run.id)
        .select(RUN_COLUMNS)
        .single();
      await recordAction(
        run.id,
        "Audience proposed",
        "Translated the goal into explicit customer rules.",
        "agent",
      );
      return { run: next as Run, step: "audience" as const };
    }

    if (!run.variants || !run.experiment) {
      // Content and experiment setup only depend on the audience, so they run concurrently.
      // Variant keys are fixed (control/b/c), which is what makes the parallel call safe.
      const customers = await loadCustomers();
      const size = customers.filter((c) => evaluateAudience(c, run.audience as AudienceRules).matches)
        .length;
      const [variants, experiment] = await Promise.all([
        agent.proposeVariants(run.goal, run.surface, run.audience.summary),
        agent.proposeExperiment(
          run.goal,
          run.surface,
          run.audience.summary,
          size,
          ["control", "b", "c"],
        ),
      ]);
      const { data: next } = await sb
        .from("runs")
        .update({ variants, experiment, status: "proposed" })
        .eq("id", run.id)
        .select(RUN_COLUMNS)
        .single();
      await recordAction(
        run.id,
        "Content assembled",
        "Searched approved assets and prepared three variants.",
        "agent",
      );
      await recordAction(
        run.id,
        "Experiment configured",
        "Set the metric, holdout, traffic split, sample requirement, and guardrails.",
        "agent",
      );
      return { run: next as Run, step: "experiment" as const };
    }


    return { run, step: "done" as const };
  });

/** Audience size + a sample of qualifying customers, evaluated against the base. */
export const getAudiencePreview = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { serverSupabase, loadCustomers } = await import("./demo.server");
    const { data: row } = await serverSupabase()
      .from("runs")
      .select("audience")
      .eq("id", data.id)
      .single();
    const audience = (row as { audience: AudienceRules | null } | null)?.audience;
    if (!audience) return { total: 0, matched: 0, sample: [] as Customer[] };

    const customers = await loadCustomers();
    const matched = customers.filter((c) => evaluateAudience(c, audience).matches);
    return { total: customers.length, matched: matched.length, sample: matched.slice(0, 6) };
  });

export const approveRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "changes"]),
        note: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const patch =
      data.decision === "approve"
        ? {
            status: "live",
            approved_at: new Date().toISOString(),
            approval_note: data.note?.trim() || null,
          }
        : { status: "changes_requested", approval_note: data.note?.trim() || null };
    const { data: row, error } = await serverSupabase()
      .from("runs")
      .update(patch)
      .eq("id", data.id)
      .select(RUN_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    await recordAction(
      data.id,
      data.decision === "approve" ? "Approved and launched" : "Changes requested",
      data.decision === "approve"
        ? "A human approved the proposal before any decisions could be served."
        : data.note?.trim() || "A human returned the proposal for revision.",
      "human",
    );
    return row as Run;
  });

/** Rewrites a step the human sent back, then returns to review. */
export const redraftRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), step: z.enum(["audience", "content", "experiment"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const patch: Record<string, unknown> = { status: "drafting", results: null };
    if (data.step === "audience") {
      patch["audience"] = null;
      patch["variants"] = null;
      patch["experiment"] = null;
    }
    if (data.step === "content") {
      patch["variants"] = null;
      patch["experiment"] = null;
    }
    if (data.step === "experiment") patch["experiment"] = null;
    const { data: row, error } = await serverSupabase()
      .from("runs")
      .update(patch)
      .eq("id", data.id)
      .select(RUN_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    await recordAction(
      data.id,
      "Redraft requested",
      `Returned the ${data.step} step to the agent for another draft.`,
      "human",
    );
    return row as Run;
  });

export const getShowcaseCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const { loadCustomers } = await import("./demo.server");
  const { pickShowcaseCustomers } = await import("./agent.server");
  return pickShowcaseCustomers(await loadCustomers());
});

/** Server-side personalization decision: what does this customer see, and why. */
export const decide = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ runId: z.string().uuid(), customerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const sb = serverSupabase();

    const [{ data: runRow }, { data: customerRow }] = await Promise.all([
      sb.from("runs").select("id, status, audience, variants, experiment").eq("id", data.runId).single(),
      sb
        .from("customers")
        .select(
          "id, name, email, total_spend, order_count, tenure_days, top_category, loyalty_tier, last_surface, sessions_30d",
        )
        .eq("id", data.customerId)
        .single(),
    ]);

    const run = runRow as {
      id: string;
      status: string;
      audience: AudienceRules | null;
      variants: VariantSet | null;
      experiment: ExperimentConfig | null;
    } | null;
    const customer = customerRow as Customer | null;
    if (!run || !customer || !run.audience || !run.variants || !run.experiment) {
      throw new Error("This experiment is not ready to serve decisions yet.");
    }

    const t0 = performance.now();
    const { matches, reasons } = evaluateAudience(customer, run.audience);
    const audienceMs = performance.now() - t0;

    const t1 = performance.now();
    const assignment = matches
      ? assign(run.id, customer.id, run.experiment)
      : { variantKey: "control", inHoldout: false, bucketValue: -1 };
    const assignMs = performance.now() - t1;

    const variantKey =
      assignment.inHoldout || !matches ? "control" : assignment.variantKey;
    const variant = run.variants.variants.find((v) => v.key === variantKey) ?? run.variants.variants[0];
    if (!variant) throw new Error("This run has no variants to serve.");

    const trace = [
      ...reasons.map((r) => (matches ? `pass: ${r}` : r)),
      matches ? "in audience" : "not in audience — default experience served",
      matches
        ? `bucket ${assignment.bucketValue}/1000 → ${assignment.inHoldout ? "holdout" : `variant ${assignment.variantKey}`}`
        : "no bucket assigned",
    ];

    await sb.from("decisions").insert({
      run_id: run.id,
      customer_id: customer.id,
      variant_key: assignment.inHoldout ? "holdout" : variantKey,
      in_audience: matches,
      in_holdout: assignment.inHoldout,
      reasons: trace,
      latency_ms: Number((audienceMs + assignMs).toFixed(3)),
      precomputed: false,
    });
    await recordAction(
      run.id,
      "Decision served",
      `Evaluated ${customer.name} and served ${assignment.inHoldout ? "holdout" : variantKey}.`,
      "system",
    );

    return {
      customer,
      variant,
      variantKey,
      inAudience: matches,
      inHoldout: assignment.inHoldout,
      trace,
      timing: {
        audienceMs: Number(audienceMs.toFixed(3)),
        assignMs: Number(assignMs.toFixed(3)),
        totalMs: Number((audienceMs + assignMs).toFixed(3)),
      },
    };
  });

export const getDecisionLog = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const { data: rows } = await serverSupabase()
      .from("decisions")
      .select("id, variant_key, in_audience, in_holdout, latency_ms, created_at")
      .eq("run_id", data.id)
      .order("created_at", { ascending: false })
      .limit(12);
    return (rows ?? []) as {
      id: string;
      variant_key: string;
      in_audience: boolean;
      in_holdout: boolean;
      latency_ms: number;
      created_at: string;
    }[];
  });

export const getRunActions = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { serverSupabase } = await import("./demo.server");
    const { data: rows, error } = await serverSupabase()
      .from("run_actions")
      .select("id, action, detail, actor, created_at")
      .eq("run_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as RunAction[];
  });

export const generateResults = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), fastForward: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { serverSupabase, loadContext } = await import("./demo.server");
    const { simulateResults } = await import("./agent.server");
    const sb = serverSupabase();
    const { data: row } = await sb.from("runs").select(RUN_COLUMNS).eq("id", data.id).single();
    const run = row as Run;
    if (!run?.variants || !run.experiment) throw new Error("Run is not live yet.");

    if (!data.fastForward && run.sample_progress_pct < 38) {
      const { data: early, error } = await sb
        .from("runs")
        .update({ sample_progress_pct: 38 })
        .eq("id", run.id)
        .select(RUN_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      await recordAction(
        run.id,
        "Early read refused",
        "Stopped analysis at 38% of the required sample; no result interpretation was produced.",
        "agent",
      );
      return { run: early as Run, outcome: "insufficient_sample" as const };
    }

    const ctx = await loadContext(run.surface);
    const results = await simulateResults(
      run.id,
      run.goal,
      run.variants,
      run.experiment,
      ctx.assets,
    );
    const { data: next } = await sb
      .from("runs")
      .update({ results, sample_progress_pct: 100 })
      .eq("id", run.id)
      .select(RUN_COLUMNS)
      .single();
    await recordAction(
      run.id,
      "Sample fast-forwarded",
      "Advanced the simulation to the required sample size.",
      "system",
    );
    await recordAction(
      run.id,
      "Readout generated",
      "Calculated deterministic simulated result rows, then generated an agent recommendation.",
      "agent",
    );
    return { run: next as Run, outcome: "readout_ready" as const };
  });

export const getBrandContext = createServerFn({ method: "GET" }).handler(async () => {
  const { loadContext } = await import("./demo.server");
  const ctx = await loadContext("account");
  return { rules: ctx.rules, assets: ctx.assets, history: ctx.history };
});

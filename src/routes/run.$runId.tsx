import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  advanceRun,
  approveRun,
  decide,
  generateResults,
  getAudiencePreview,
  getDecisionLog,
  getRun,
  getRunActions,
  getShowcaseCustomers,
  redraftRun,
} from "@/lib/agent.functions";
import { Button } from "@/components/ui/button";
import {
  describeRules,
  SURFACES,
  type Run,
  type RunAction,
  type Variant,
} from "@/lib/personalization";

const runQuery = (id: string) =>
  queryOptions({
    queryKey: ["run", id],
    queryFn: () => getRun({ data: { id } }),
  });

export const Route = createFileRoute("/run/$runId")({
  head: () => ({
    meta: [
      { title: "Agent run — audience, variants, experiment | Closed Loop" },
      {
        name: "description",
        content:
          "Watch the agent build an audience, assemble on-brand variants and configure a web personalization experiment, then approve it and see per-visitor decisions.",
      },
      { property: "og:title", content: "Agent run — audience, variants, experiment" },
      {
        property: "og:description",
        content:
          "The full chain: audience, content, experiment, approval, live decisions and a results readout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runQuery(params.runId)),
  component: RunPage,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center text-muted-foreground">
      This run could not be loaded.{" "}
      <Link to="/console" className="text-primary">
        Start a new one
      </Link>
      .
    </div>
  ),
});

/* ------------------------------- primitives ------------------------------- */

function StatusPill({ status }: { status: Run["status"] }) {
  const map: Record<Run["status"], [string, string]> = {
    drafting: ["Agent working", "border-primary/50 text-primary"],
    proposed: ["Awaiting your approval", "border-primary/50 text-primary"],
    live: ["Live", "border-signal/50 text-signal"],
    changes_requested: ["Changes requested", "border-border text-muted-foreground"],
  };
  const [label, cls] = map[status];
  return (
    <span className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wider ${cls}`}>
      {label.toUpperCase()}
    </span>
  );
}

function StepCard({
  n,
  title,
  state,
  children,
  onRedraft,
}: {
  n: string;
  title: string;
  state: "pending" | "working" | "done";
  children?: React.ReactNode | undefined;
  onRedraft?: (() => void | Promise<void>) | undefined;
}) {
  return (
    <section className="relative rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span className="label-caps">{n}</span>
          <h2 className="text-xl">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {state === "working" && (
            <span className="animate-pulse font-mono text-[11px] tracking-wider text-primary">
              THINKING…
            </span>
          )}
          {state === "pending" && <span className="label-caps">queued</span>}
          {state === "done" && onRedraft && (
            <button
              onClick={onRedraft}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Redraft
            </button>
          )}
        </div>
      </header>
      {children && <div className="px-6 py-5">{children}</div>}
    </section>
  );
}

function Reasoning({ text }: { text: string }) {
  return (
    <p className="border-l-2 border-primary/50 pl-4 text-sm leading-relaxed text-muted-foreground">
      {text}
    </p>
  );
}

/* -------------------------------- the page -------------------------------- */

function RunPage() {
  const { runId } = Route.useParams();
  const { data: run } = useSuspenseQuery(runQuery(runId));
  const qc = useQueryClient();
  const advance = useServerFn(advanceRun);
  const [busy, setBusy] = useState<string | null>(null);
  const looping = useRef(false);

  useEffect(() => {
    if (!run || run.status !== "drafting" || looping.current) return;
    looping.current = true;
    (async () => {
      try {
        let current: Run = run;
        let guard = 0;
        while (current.status === "drafting" && guard++ < 5) {
          setBusy(!current.audience ? "audience" : "content experiment");
          const res = await advance({ data: { id: runId } });
          current = res.run;
          qc.setQueryData(["run", runId], current);
          qc.invalidateQueries({ queryKey: ["audience", runId] });
          qc.invalidateQueries({ queryKey: ["run-actions", runId] });
          if (res.step === "done") break;
        }
      } catch {
        toast.error("The agent hit an error on that step. Try redrafting it.");
      } finally {
        setBusy(null);
        looping.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status, runId]);

  if (!run) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center text-muted-foreground">
        That run no longer exists.{" "}
        <Link to="/console" className="text-primary">
          Start a new one
        </Link>
        .
      </div>
    );
  }

  const surfaceLabel = SURFACES.find((s) => s.value === run.surface)?.label ?? run.surface;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link to="/console" className="label-caps hover:text-foreground">
        ← Console
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps">Goal · {surfaceLabel}</p>
          <h1 className="mt-3 max-w-2xl text-3xl leading-snug">{run.goal}</h1>
        </div>
        <StatusPill status={run.status} />
      </div>

      <div className="mt-10 space-y-4">
        <AudienceStep run={run} busy={busy} />
        <ContentStep run={run} busy={busy} />
        <ExperimentStep run={run} busy={busy} />
      </div>

      <ApprovalGate run={run} />

      {run.status === "live" && (
        <>
          <LiveSurface run={run} />
          <ResultsPanel run={run} />
        </>
      )}
      <ActionLog runId={run.id} />
    </div>
  );
}

/* ------------------------------ step: audience ----------------------------- */

function AudienceStep({ run, busy }: { run: Run; busy: string | null }) {
  const qc = useQueryClient();
  const redraft = useServerFn(redraftRun);
  const { data: preview } = useQuery({
    queryKey: ["audience", run.id],
    queryFn: () => getAudiencePreview({ data: { id: run.id } }),
    enabled: !!run.audience,
  });

  const state = run.audience ? "done" : busy === "audience" ? "working" : "pending";

  return (
    <StepCard
      n="01"
      title="Audience"
      state={state}
      onRedraft={
        run.status === "live"
          ? undefined
          : async () => {
              const next = await redraft({ data: { id: run.id, step: "audience" } });
              qc.setQueryData(["run", run.id], next);
            }
      }
    >
      {run.audience ? (
        <div className="space-y-5">
          <p className="text-base text-foreground">{run.audience.summary}</p>
          <div>
            <p className="label-caps">Matching rules</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-foreground">
              {describeRules(run.audience).map((r) => (
                <li key={r} className="rounded bg-secondary px-3 py-1.5">
                  {r}
                </li>
              ))}
            </ul>
          </div>
          {preview && (
            <div>
              <p className="label-caps">
                {preview.matched} of {preview.total} customers qualify (
                {((preview.matched / Math.max(preview.total, 1)) * 100).toFixed(1)}% of the base)
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(preview.matched / Math.max(preview.total, 1)) * 100}%` }}
                />
              </div>
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {preview.sample.map((c) => (
                  <li key={c.id} className="font-mono">
                    {c.name} · ${c.total_spend} · {c.order_count} orders · {c.loyalty_tier} ·{" "}
                    {c.top_category}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Reasoning text={run.audience.reasoning} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Reading the goal against the customer table…
        </p>
      )}
    </StepCard>
  );
}

/* ------------------------------ step: content ------------------------------ */

function VariantCard({ v }: { v: Variant }) {
  return (
    <div className="rounded-md border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-wider text-primary">
          {v.key.toUpperCase()}
        </span>
        <span className="text-xs text-muted-foreground">{v.label}</span>
      </div>
      <p className="mt-4 font-display text-xl leading-snug text-foreground">{v.headline}</p>
      <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
      <p className="mt-4 inline-block rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
        {v.cta}
      </p>
      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
        <div>
          <dt className="label-caps">Source</dt>
          <dd className="mt-1 text-muted-foreground">
            {v.reused_asset_name ? (
              <>
                Reused approved asset <span className="text-signal">{v.reused_asset_name}</span>
              </>
            ) : (
              "Newly written — nothing in the library fitted"
            )}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Why</dt>
          <dd className="mt-1 text-muted-foreground">{v.rationale}</dd>
        </div>
        {v.brand_rules_followed.length > 0 && (
          <div>
            <dt className="label-caps">Brand rules applied</dt>
            <dd className="mt-1 space-y-1 text-muted-foreground">
              {v.brand_rules_followed.map((r) => (
                <p key={r}>· {r}</p>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function ContentStep({ run, busy }: { run: Run; busy: string | null }) {
  const qc = useQueryClient();
  const redraft = useServerFn(redraftRun);
  const state = run.variants ? "done" : busy === "content" ? "working" : "pending";

  return (
    <StepCard
      n="02"
      title="Content"
      state={state}
      onRedraft={
        run.status === "live"
          ? undefined
          : async () => {
              const next = await redraft({ data: { id: run.id, step: "content" } });
              qc.setQueryData(["run", run.id], next);
            }
      }
    >
      {run.variants ? (
        <div className="space-y-5">
          <Reasoning text={run.variants.reasoning} />
          <div className="grid gap-4 sm:grid-cols-2">
            {run.variants.variants.map((v) => (
              <VariantCard key={v.key} v={v} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Searching the approved asset library before writing anything new…
        </p>
      )}
    </StepCard>
  );
}

/* ---------------------------- step: experiment ---------------------------- */

function ExperimentStep({ run, busy }: { run: Run; busy: string | null }) {
  const qc = useQueryClient();
  const redraft = useServerFn(redraftRun);
  const state = run.experiment ? "done" : busy === "experiment" ? "working" : "pending";
  const e = run.experiment;

  return (
    <StepCard
      n="03"
      title="Experiment"
      state={state}
      onRedraft={
        run.status === "live"
          ? undefined
          : async () => {
              const next = await redraft({ data: { id: run.id, step: "experiment" } });
              qc.setQueryData(["run", run.id], next);
            }
      }
    >
      {e ? (
        <div className="space-y-5">
          <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
            {[
              ["Primary metric", e.metric],
              ["Holdout", `${e.holdout_pct}%`],
              ["Min sample / variant", e.min_sample_per_variant.toLocaleString()],
              ["Expected duration", `${e.expected_days} days`],
            ].map(([k, v]) => (
              <div key={k} className="bg-card px-4 py-3">
                <dt className="label-caps">{k}</dt>
                <dd className="mt-1 text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="label-caps">Traffic split (after holdout)</p>
            <div className="mt-2 flex overflow-hidden rounded-md border border-border font-mono text-xs">
              {e.traffic_split.map((t, i) => (
                <div
                  key={t.key}
                  style={{ width: `${t.pct}%` }}
                  className={`px-2 py-2 text-center ${i === 0 ? "bg-secondary text-muted-foreground" : "bg-primary/20 text-foreground"}`}
                >
                  {t.key} {t.pct}%
                </div>
              ))}
            </div>
          </div>
          {e.guardrails.length > 0 && (
            <div>
              <p className="label-caps">Guardrails</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {e.guardrails.map((g) => (
                  <li key={g}>· {g}</li>
                ))}
              </ul>
            </div>
          )}
          <Reasoning text={e.reasoning} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sizing the test and setting the holdout…</p>
      )}
    </StepCard>
  );
}

/* ----------------------------- approval gate ------------------------------ */

function ApprovalGate({ run }: { run: Run }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveRun);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (run.status === "drafting") return null;

  if (run.status === "live") {
    return (
      <div className="mt-8 rounded-lg border border-signal/40 bg-card px-6 py-5">
        <p className="label-caps">Approved by a human</p>
        <p className="mt-2 text-sm text-foreground">
          Launched {run.approved_at ? new Date(run.approved_at).toLocaleString() : ""}. Serving
          decisions now.
        </p>
        {run.approval_note && (
          <p className="mt-2 text-sm text-muted-foreground">Note: {run.approval_note}</p>
        )}
      </div>
    );
  }

  async function act(decision: "approve" | "changes") {
    setSaving(true);
    try {
      const next = await approve({ data: { id: run.id, decision, note: note || undefined } });
      qc.setQueryData(["run", run.id], next);
      qc.invalidateQueries({ queryKey: ["run-actions", run.id] });
      toast.success(decision === "approve" ? "Approved and live." : "Sent back with your note.");
    } catch {
      toast.error("That did not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-primary/40 bg-card p-6">
      <p className="label-caps">Approval gate</p>
      <h2 className="mt-3 text-2xl">Nothing serves until you approve it</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Approve to start serving decisions, or send a step back with a note and the agent redrafts
        it.
      </p>
      {run.status === "changes_requested" && run.approval_note && (
        <p className="mt-4 rounded-md bg-secondary px-4 py-3 text-sm text-foreground">
          Your last note: {run.approval_note}
        </p>
      )}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note — e.g. tighten the audience to Gold members only"
        className="mt-5 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          disabled={saving}
          onClick={() => act("approve")}
          className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          Approve &amp; launch
        </button>
        <button
          disabled={saving}
          onClick={() => act("changes")}
          className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          Request changes
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ live surface ------------------------------ */

type Decision = Awaited<ReturnType<typeof decide>>;

function LiveSurface({ run }: { run: Run }) {
  const decideFn = useServerFn(decide);
  const qc = useQueryClient();
  const { data: customers } = useQuery({
    queryKey: ["showcase-customers"],
    queryFn: () => getShowcaseCustomers(),
  });
  const { data: log } = useQuery({
    queryKey: ["decision-log", run.id],
    queryFn: () => getDecisionLog({ data: { id: run.id } }),
  });
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function serve(customerId: string) {
    setPending(customerId);
    try {
      const d = await decideFn({ data: { runId: run.id, customerId } });
      setDecision(d);
      qc.invalidateQueries({ queryKey: ["decision-log", run.id] });
      qc.invalidateQueries({ queryKey: ["run-actions", run.id] });
    } catch {
      toast.error("The server decision returned an error.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mt-12">
      <p className="label-caps">04 · Live surface</p>
      <h2 className="mt-3 text-3xl">Pick a customer, see their page</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Each click makes a real server call that evaluates the sample customer's rules, assigns a
        stable bucket and records the trace. The timing below covers only that in-process JavaScript.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {customers?.map((c) => (
          <button
            key={c.id}
            onClick={() => serve(c.id)}
            className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              decision?.customer.id === c.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="block text-sm text-foreground">{c.name}</span>
            <span className="font-mono">
              ${c.total_spend} · {c.order_count} orders · {c.loyalty_tier}
            </span>
            {pending === c.id && <span className="ml-2 text-primary">…</span>}
          </button>
        ))}
      </div>

      {decision && (
        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          {/* the rendered surface, in the brand's light theme */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 font-mono text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                shop.example.com/{run.surface}
              </div>
              <div className="bg-surface px-7 py-8 text-surface-foreground">
                <p className="font-mono text-[11px] tracking-widest text-surface-foreground/60">
                  NORTHFIELD SUPPLY
                </p>
                <h3 className="mt-6 font-display text-2xl">Hello, {decision.customer.name}</h3>
                <p className="mt-1 text-sm text-surface-foreground/70">
                  {decision.customer.order_count} orders · {decision.customer.loyalty_tier} member
                </p>

                <div className="mt-7 rounded-md border border-surface-foreground/15 bg-white/60 p-6">
                  <p className="font-display text-2xl leading-snug">{decision.variant.headline}</p>
                  <p className="mt-2 text-sm text-surface-foreground/75">{decision.variant.body}</p>
                  <p className="mt-5 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    {decision.variant.cta}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-surface-foreground/60">
                  {["Orders", "Addresses", "Payment methods"].map((t) => (
                    <div key={t} className="rounded border border-surface-foreground/10 px-3 py-3">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* trace + latency */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="label-caps">Decision trace</p>
              <p className="mt-3 text-sm text-foreground">
                Served{" "}
                <span className="font-mono text-primary">
                  {decision.inHoldout ? "holdout" : decision.variantKey}
                </span>{" "}
                because:
              </p>
              <ul className="mt-3 space-y-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {decision.trace.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <p className="label-caps">Decision latency</p>
              <p className="mt-3 font-display text-3xl text-foreground">
                {decision.timing.totalMs.toFixed(2)}
                <span className="ml-1 font-sans text-sm text-muted-foreground">ms</span>
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex justify-between gap-3">
                  <span>Rule evaluation on an already-loaded sample record</span>
                  <span className="font-mono text-foreground">
                    {decision.timing.audienceMs.toFixed(2)}ms
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Bucket assignment (evaluated per request)</span>
                  <span className="font-mono text-foreground">
                    {decision.timing.assignMs.toFixed(2)}ms
                  </span>
                </li>
              </ul>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                This number excludes data retrieval, log writes, serialization and network time. In
                production, segment membership would be computed in batch and cached; only stable
                assignment and variant selection would remain in the request path.
              </p>
            </div>
          </div>
        </div>
      )}

      {log && log.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <p className="label-caps border-b border-border bg-card px-5 py-3">Decision log</p>
          <table className="w-full text-left font-mono text-xs">
            <tbody className="divide-y divide-border">
              {log.map((d) => (
                <tr key={d.id} className="bg-card/50">
                  <td className="px-5 py-2 text-muted-foreground">
                    {new Date(d.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-2 text-foreground">{d.variant_key}</td>
                  <td className="px-5 py-2 text-muted-foreground">
                    {d.in_audience ? "in audience" : "not in audience"}
                  </td>
                  <td className="px-5 py-2 text-right text-muted-foreground">
                    {Number(d.latency_ms).toFixed(2)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------- results -------------------------------- */

function ResultsPanel({ run }: { run: Run }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateResults);
  const [loading, setLoading] = useState(false);
  const results = run.results;

  async function run_(fastForward = false) {
    setLoading(true);
    try {
      const response = await gen({ data: { id: run.id, fastForward } });
      qc.setQueryData(["run", run.id], response.run);
      qc.invalidateQueries({ queryKey: ["run-actions", run.id] });
    } catch {
      toast.error("The readout could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-14">
      <p className="label-caps">05 · Readout</p>
      <h2 className="mt-3 text-3xl">What the experiment says</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        These numbers are a simulation, generated deterministically from this run so the demo has
        something to reason about. Nothing here is a real performance claim.
      </p>

      {!results && run.sample_progress_pct < 38 ? (
        <Button onClick={() => run_(false)} disabled={loading} size="lg" className="mt-6">
          {loading ? "Checking sample…" : "Run the analysis"}
        </Button>
      ) : !results ? (
        <div className="mt-6 border-l-2 border-primary bg-card px-6 py-5">
          <p className="label-caps">Analysis refused</p>
          <h3 className="mt-2 text-2xl">38% of required sample — no read available</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Looking now would invite peeking bias. The agent will not calculate lift, confidence or a
            recommendation before the minimum sample is reached.
          </p>
          <div className="mt-5 h-1.5 max-w-md overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[38%] bg-primary" />
          </div>
          <Button onClick={() => run_(true)} disabled={loading} size="lg" className="mt-5">
            {loading ? "Fast-forwarding…" : "Fast-forward to required sample"}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-125 text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  {["Variant", "Visitors", "Conversions", "Rate", "Lift", "Confidence"].map((h) => (
                    <th key={h} className="label-caps px-5 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.rows.map((r) => (
                  <tr key={r.key} className="bg-card/50">
                    <td className="px-5 py-3 text-foreground">
                      <span className="font-mono text-xs text-primary">{r.key}</span>{" "}
                      <span className="text-muted-foreground">{r.label}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">
                      {r.visitors.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{r.conversions}</td>
                    <td className="px-5 py-3 font-mono text-foreground">
                      {(r.rate * 100).toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {r.lift_vs_control == null ? (
                        <span className="text-muted-foreground">control</span>
                      ) : (
                        <span className={r.lift_vs_control > 0 ? "text-signal" : "text-destructive"}>
                          {r.lift_vs_control > 0 ? "+" : ""}
                          {r.lift_vs_control.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">
                      {r.key === results.rows[0]?.key && r.lift_vs_control == null
                        ? "—"
                        : `${(r.confidence * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <p className="label-caps">Agent recommendation</p>
            <p className="mt-3 inline-block rounded-full border border-primary/50 px-3 py-1 font-mono text-[11px] tracking-wider text-primary">
              {results.recommendation_action.toUpperCase()}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground">{results.recommendation}</p>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Simulated data. In production this step reads the event pipeline and can reallocate
              traffic automatically once confidence clears the threshold you set.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ActionLog({ runId }: { runId: string }) {
  const { data: actions } = useQuery({
    queryKey: ["run-actions", runId],
    queryFn: () => getRunActions({ data: { id: runId } }),
  });

  const actorLabel: Record<RunAction["actor"], string> = {
    agent: "Agent alone",
    human: "Human",
    system: "System",
  };

  if (!actions?.length) return null;

  return (
    <section className="mt-14">
      <p className="label-caps">06 · Action log</p>
      <h2 className="mt-3 text-3xl">Who did what</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The workflow history separates autonomous work, system execution and decisions that required
        human approval.
      </p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-150 text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              {['Time', 'Action', 'Owner', 'Detail'].map((heading) => (
                <th key={heading} className="label-caps px-5 py-3 font-normal">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {actions.map((entry) => (
              <tr key={entry.id} className="bg-card/50 align-top">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleTimeString()}
                </td>
                <td className="px-5 py-3 text-foreground">{entry.action}</td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className={entry.actor === "human" ? "text-signal" : "text-primary"}>
                    {actorLabel[entry.actor]}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

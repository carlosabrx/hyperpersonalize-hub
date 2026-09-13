import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createRun, listRuns } from "@/lib/agent.functions";
import { SURFACES } from "@/lib/personalization";

const runsQuery = queryOptions({
  queryKey: ["runs"],
  queryFn: () => listRuns(),
});

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Console — describe a goal, get an experiment | Closed Loop" },
      {
        name: "description",
        content:
          "Type a growth goal. The agent proposes the audience, the on-brand variants and the experiment setup, then waits for your approval.",
      },
      { property: "og:title", content: "Console — describe a goal, get an experiment" },
      {
        property: "og:description",
        content:
          "The agent proposes audience, variants and experiment setup from one plain-language goal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(runsQuery),
  component: Console,
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center text-muted-foreground">
      The console could not load. Please refresh.
    </div>
  ),
});

const EXAMPLES = [
  {
    goal: "Lift loyalty signups among high-spend repeat buyers on the account page.",
    surface: "account",
  },
  {
    goal: "Get first-time visitors researching footwear to add to cart.",
    surface: "product",
  },
  {
    goal: "Move Silver members one order closer to Gold.",
    surface: "account",
  },
  {
    goal: "Recover carts that stall just below the free shipping threshold.",
    surface: "cart",
  },
];

const STATUS_LABEL: Record<string, string> = {
  drafting: "Agent working",
  proposed: "Awaiting approval",
  live: "Live",
  changes_requested: "Changes requested",
};

function Console() {
  const { data: runs } = useSuspenseQuery(runsQuery);
  const create = useServerFn(createRun);
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [surface, setSurface] = useState<string>("account");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (goal.trim().length < 8) {
      toast.error("Describe the goal in a sentence or two.");
      return;
    }
    setSubmitting(true);
    try {
      const run = await create({ data: { goal, surface } });
      navigate({ to: "/run/$runId", params: { runId: run.id } });
    } catch {
      toast.error("The run could not be started. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className="label-caps">New run</p>
      <h1 className="mt-4 text-4xl">What do you want to move?</h1>
      <p className="mt-3 text-muted-foreground">
        One sentence is enough. The agent works out the audience, the copy and the test design from
        there.
      </p>

      <form onSubmit={submit} className="mt-8 rounded-lg border border-border bg-card p-6">
        <label htmlFor="goal" className="label-caps">
          Goal
        </label>
        <textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Lift loyalty signups among high-spend repeat buyers on the account page."
          className="mt-3 w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none"
        />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <label htmlFor="surface" className="label-caps">
              Surface
            </label>
            <select
              id="surface"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="mt-2 block rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
            >
              {SURFACES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Starting…" : "Run the agent"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <p className="label-caps">Or start from one of these</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.goal}
              type="button"
              onClick={() => {
                setGoal(ex.goal);
                setSurface(ex.surface);
              }}
              className="rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              {ex.goal}
            </button>
          ))}
        </div>
      </div>

      {runs.length > 0 && (
        <div className="mt-14">
          <p className="label-caps">Recent runs</p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  to="/run/$runId"
                  params={{ runId: r.id }}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.goal}</span>
                  <span className="label-caps shrink-0">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Closed Loop — Agentic Personalization Console" },
      {
        name: "description",
        content:
          "Describe a growth goal. An agent builds the audience, writes on-brand variants, configures the experiment with a holdout, and waits for your approval before it goes live.",
      },
      { property: "og:title", content: "Closed Loop — Agentic Personalization Console" },
      {
        property: "og:description",
        content:
          "A working demo: one growth goal in, a ready-to-launch web personalization experiment out — with a human approval gate.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    title: "Audience",
    body: "The agent turns the goal into a filter over customer data that already exists, and shows how many people qualify.",
  },
  {
    n: "02",
    title: "Content",
    body: "It searches the approved asset library first, reuses what fits, and only writes new copy when nothing does.",
  },
  {
    n: "03",
    title: "Experiment",
    body: "Traffic split, holdout, primary metric, sample size and guardrails — configured, not hand-assembled.",
  },
  {
    n: "04",
    title: "Approval",
    body: "Nothing serves until a human approves. Send any step back with a note and the agent redrafts it.",
  },
  {
    n: "05",
    title: "Decisions",
    body: "A live surface decides per visitor in under a millisecond and records exactly why they saw what they saw.",
  },
  {
    n: "06",
    title: "Readout",
    body: "Lift, confidence and a recommendation: keep testing, declare a winner, or reallocate traffic.",
  },
];

function Landing() {
  return (
    <div>
      <section className="border-b border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="label-caps">Web &amp; mobile personalization · portfolio demo</p>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.08] sm:text-6xl">
            A growth team runs 8 experiments a quarter because coordinating one takes four weeks.
            <span className="text-primary"> This runs one in four minutes.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg text-muted-foreground">
            Describe what you want to move. An agent builds the audience from customer data you
            already have, assembles on-brand variants from your approved library, configures the
            experiment with a holdout, and stops at a human approval gate before anything reaches a
            visitor.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/console"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try the demo
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex h-11 items-center rounded-md border border-border px-6 text-sm text-foreground transition-colors hover:bg-accent"
            >
              How it works
            </Link>
          </div>

          <dl className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {[
              ["2–4 weeks", "to coordinate one experiment across analyst, PM, designer, engineer"],
              ["5 people", "involved before a single variant reaches a visitor"],
              ["1 approval", "is the only human step left when the agent owns the chain"],
            ].map(([stat, label]) => (
              <div key={stat} className="bg-card px-6 py-7">
                <dt className="text-2xl text-foreground">{stat}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl">One workflow, not six handoffs</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Each step below is a real capability in this demo, backed by sample customer data, brand
          rules, an asset library and a history of past tests.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-card px-6 py-7">
              <span className="label-caps">{s.n}</span>
              <h3 className="mt-3 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="rounded-lg border border-border bg-card p-8 sm:p-12">
            <h2 className="text-3xl">Start with a goal, in your own words</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              No segment builder, no targeting rules, no ticket for the design team.
            </p>
            <ul className="mt-8 space-y-3 font-mono text-sm text-foreground">
              <li className="border-l-2 border-primary pl-4">
                Lift loyalty signups among high-spend repeat buyers on the account page.
              </li>
              <li className="border-l-2 border-border pl-4">
                Get first-time visitors researching footwear to add to cart.
              </li>
              <li className="border-l-2 border-border pl-4">
                Move Silver members one order closer to Gold.
              </li>
            </ul>
            <Link
              to="/console"
              className="mt-9 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open the console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

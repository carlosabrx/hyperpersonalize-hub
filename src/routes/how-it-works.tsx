import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — the product thinking behind the console | Closed Loop" },
      {
        name: "description",
        content:
          "Why agentic personalization needs a context layer, an approval gate and a batch/real-time split — and how each of those shows up in this demo.",
      },
      { property: "og:title", content: "How it works — the product thinking behind the console" },
      {
        property: "og:description",
        content:
          "Agent-vs-human ownership, the context layer, trust sequencing and where the commercial value lands.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid-rule py-10">
      <p className="label-caps">{n}</p>
      <h2 className="mt-3 text-3xl">{title}</h2>
      <div className="mt-4 max-w-2xl space-y-4 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Split({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-card">
            <th className="label-caps px-5 py-3 font-normal">Step</th>
            <th className="label-caps px-5 py-3 font-normal">Agent does</th>
            <th className="label-caps px-5 py-3 font-normal">Human owns</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([a, b, c]) => (
            <tr key={a} className="bg-card/50">
              <td className="px-5 py-3 text-foreground">{a}</td>
              <td className="px-5 py-3 text-muted-foreground">{b}</td>
              <td className="px-5 py-3 text-muted-foreground">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className="label-caps">Case study</p>
      <h1 className="mt-4 max-w-3xl text-5xl leading-tight">
        The bottleneck was never the idea. It was the coordination.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        A growth team that wants to run fifty experiments a quarter instead of eight does not need
        fifty more ideas. It needs to stop spending three weeks per test getting an audience out of
        the warehouse, copy past brand review, and a test configured correctly. This demo is one
        answer to that: an agent that drafts the whole chain, and a human who approves it.
      </p>

      <Section n="01" title="Where the three weeks actually go">
        <p>
          Every experiment touches four teams. Data builds the segment. Content writes the variants
          and waits for brand sign-off. Analytics sizes the test. Engineering ships the surface. Each
          handoff is a queue, and queues — not thinking time — set the ceiling on how many tests a
          quarter you can run.
        </p>
        <p>
          The agent's job is to collapse those queues into one draft that a single person can review
          in five minutes. It is not there to have better ideas than the growth lead. It is there to
          do the assembly.
        </p>
      </Section>

      <Section n="02" title="What the agent owns, and what it never owns">
        <p>
          The division matters more than the model. Anything reversible and mechanical goes to the
          agent. Anything that touches real customers, brand risk or budget stays with a person.
        </p>
        <Split
          rows={[
            [
              "Audience",
              "Translates the goal into concrete filters and shows who qualifies",
              "Confirms the segment is the one they meant",
            ],
            [
              "Content",
              "Searches approved assets first, writes new copy only when nothing fits",
              "Brand judgement on anything newly written",
            ],
            [
              "Experiment",
              "Sets split, holdout, sample size and guardrails",
              "Accepts the tradeoff between speed and certainty",
            ],
            ["Launch", "Nothing", "The approval — always"],
            [
              "Serving",
              "Assigns every visitor and logs why",
              "Reads the trace when something looks wrong",
            ],
            [
              "Readout",
              "Computes lift and confidence, recommends an action",
              "Decides whether to ship, iterate or kill",
            ],
          ]}
        />
      </Section>

      <Section n="03" title="The context layer is the product">
        <p>
          A general-purpose model asked to write a promo headline invents an offer. That is the whole
          reason marketing teams do not trust generated creative. The fix is not a better prompt, it
          is grounding: before the agent writes anything it reads the brand's voice rules, the
          library of already-approved assets with their past lift, and the history of what has
          already been tested on this surface.
        </p>
        <p>
          So each variant in the console carries its provenance — reused asset or newly written,
          which brand rules it followed, and why it was chosen over the alternatives. Provenance is
          what makes review fast, and fast review is what makes the loop work.
        </p>
      </Section>

      <Section n="04" title="Trust is earned in a sequence, not granted">
        <p>
          No team hands an agent live traffic on day one. The sensible path is staged: first the
          agent drafts and a human approves every step. Then the human approves only the content.
          Then the agent is allowed to reallocate traffic between already-approved variants once
          confidence clears a threshold. Full autonomy, if it ever arrives, arrives last.
        </p>
        <p>
          This demo deliberately sits at stage one, with the gate in the middle of the page rather
          than buried in a settings menu. The gate is the feature.
        </p>
      </Section>

      <Section n="05" title="Batch where you can, real-time where you must">
        <p>
          Personalization dies on latency. Working out whether someone belongs to a
          high-spend-repeat-buyer segment means aggregating their order history — far too slow to do
          while a page is rendering. Choosing which variant that person sees, on the other hand,
          depends on the request and cannot be precomputed.
        </p>
        <p>
          So the split is: segment membership computed in batch and cached, assignment evaluated per
          request. The latency panel on a live run shows both halves separately, which is the number
          an engineering reviewer will ask about first.
        </p>
      </Section>

      <Section n="06" title="Where the money is">
        <p>
          The buyer is a growth or lifecycle lead whose quarterly target depends on conversion rate,
          and whose real constraint is throughput. The pitch is not "AI writes your copy" — it is
          "your test velocity stops being limited by other teams' calendars".
        </p>
        <p>
          That framing also sets the metric the product should be measured on: experiments launched
          per quarter, and time from goal to live. Lift per experiment is downstream of both.
        </p>
      </Section>

      <Section n="07" title="What is real here and what is not">
        <p>
          Real: the model calls that propose the audience, content and experiment; server functions
          that read and write each run; audience-rule evaluation against the seeded customer table;
          deterministic bucketing; a human approval gate; and persisted decision and action logs.
        </p>
        <p>
          The decision path is a real server call, not a client-only function. Its displayed timing
          measures only in-process JavaScript rule evaluation and assignment. It excludes customer
          and run retrieval, log writes, serialization and network time. The demo evaluates rules on
          already-loaded sample records; a production system would precompute segment membership and
          retrieve that cached membership during the request.
        </p>
        <p>
          Simulated: every customer record, brand rule, approved asset, past experiment and result
          number. The readout is deterministic for a run, but it is not observed business
          performance. Nothing on this site is a real performance claim about any business.
        </p>
      </Section>

      <Section n="08" title="What this does not solve">
        <p>
          Cold start remains: an anonymous visitor with no identity or history gives the system very
          little signal, so a safe default experience still matters.
        </p>
        <p>
          Segment membership can become stale during a session. A customer who buys, returns an item
          or changes tier may keep an earlier decision until the cache is refreshed or explicitly
          invalidated.
        </p>
        <p>
          Testing many variants across many segments creates a multiple-comparisons problem. A
          production readout needs correction, pre-registered hypotheses or stricter stopping rules;
          this demo does not implement those controls.
        </p>
      </Section>

      <div className="grid-rule py-12">
        <Link
          to="/console"
          className="inline-flex h-12 items-center rounded-md bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try it on a goal of your own
        </Link>
      </div>
    </div>
  );
}

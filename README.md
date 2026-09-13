# Closed Loop

**An agentic personalization console.** Describe a growth goal in plain language; an agent builds the audience, assembles on-brand variants, configures the experiment with a holdout, and stops at a human approval gate before anything reaches a visitor.

**[Live demo](https://hyperpersonalize-hub.lovable.app)** · **[Product write-up](https://the-coordination-problem-xjp6hty.gamma.site/)** · **[How it works](https://hyperpersonalize-hub.lovable.app/how-it-works)**

<!-- Drop the 90-second walkthrough here once recorded. GitHub renders mp4 inline if you
     commit the file to demo/ and reference it as a relative path:
     https://github.com/carlosabrx/hyperpersonalize-hub/assets/... -->

---

## Why this exists

A growth team that wants to run fifty web personalization experiments a quarter instead of eight doesn't need fifty more ideas. It needs to stop spending three weeks per test pulling an audience out of the warehouse, getting copy through brand review, and configuring the experiment correctly. Every one of those handoffs is a queue, and queues — not thinking time — set the ceiling on test velocity.

Existing tools (Optimizely, Adobe Target) solve the infrastructure and leave the coordination untouched. This is a prototype of the other answer: an agent that drafts the entire chain, and one human who approves it.

I built it as a working argument rather than a deck, while looking at founding PM work in agentic marketing.

## What it does

| | Step | |
|---|---|---|
| 01 | **Audience** | Turns the goal into a concrete filter over existing customer data and shows how many people qualify |
| 02 | **Content** | Searches the approved asset library first, reuses what fits, writes new copy only when nothing does |
| 03 | **Experiment** | Configures traffic split, holdout, primary metric, sample size and guardrails |
| 04 | **Approval** | Nothing serves until a human approves; any step can be sent back with a note |
| 05 | **Decisions** | Assigns each visitor and records why they saw what they saw |
| 06 | **Readout** | Lift, confidence, and a recommendation — keep testing, declare a winner, or reallocate |

## The three product arguments

### 1. The autonomy boundary matters more than the model

Anything reversible and mechanical goes to the agent. Anything touching real customers, brand risk, or budget stays with a person.

| Step | Agent does | Human owns |
|---|---|---|
| Audience | Translates the goal into filters, shows who qualifies | Confirms it's the segment they meant |
| Content | Searches approved assets first, writes only when nothing fits | Brand judgement on anything new |
| Experiment | Sets split, holdout, sample size, guardrails | Accepts the speed/certainty tradeoff |
| Launch | Nothing | The approval — always |
| Serving | Assigns every visitor and logs why | Reads the trace when something looks wrong |
| Readout | Computes lift and confidence, recommends | Decides whether to ship, iterate, or kill |

### 2. Trust is earned in a sequence, not granted

No team hands an agent live traffic on day one. The adoption path is staged: agent drafts and a human approves every step → human approves content only → agent reallocates traffic between already-approved variants once confidence clears a threshold. Full autonomy, if it ever arrives, arrives last.

This demo deliberately sits at stage one, with the gate in the middle of the page rather than buried in a settings menu. Burying it would signal that it's a formality.

### 3. Batch where you can, real-time where you must

Personalization dies on latency. Working out whether someone belongs to a high-spend-repeat-buyer segment means aggregating order history — too slow to do while a page renders. Choosing which variant that person sees depends on the request and can't be precomputed.

So the split is: **segment membership computed in batch and cached; variant assignment evaluated per request.** The agent is a control-plane system that writes policy offline. It is never in the request path.

This has consequences the demo doesn't solve — see below.

## What's real and what's simulated

Being precise here matters more than looking impressive.

**Real:** the agent calls, audience evaluation against a seeded customer table, the decision endpoint, deterministic bucketing, latency measurement, logged decision traces, and the approval state machine.

**Simulated:** customer records, brand rules, the asset library, experiment history, and every result number. Nothing here is a performance claim about any real business.

## How it was built

Lovable and Claude, over one weekend. The tooling was a deliberate prioritization call: the questions I wanted to answer were where the human gate belongs and how segment membership gets cached. Neither required hand-writing a backend, and a weekend spent on infrastructure would have produced a worse answer to the questions that actually matter.

Stack: React / TypeScript / Tailwind, generated and iterated in Lovable.

## What I didn't build

Naming these precisely is part of the work.

- **Cold start.** Most real traffic is anonymous. Precomputed segment membership does nothing for a visitor with no profile. The honest fix is deciding on in-session signals rather than history, with a well-chosen control as the fallback.
- **Decision staleness.** A decision computed last night doesn't know someone just added a tent to their cart. The real answer is hybrid — a precomputed base decision plus a small set of fast in-session rules that can override it.
- **Multiple comparisons.** An agent that slices results across segments will find "winners" in noise. Correction needs to be built in, not bolted on.
- **Anything below the surface layer:** auth, real checkout, mobile SDKs, multi-tenancy, more than one slot.

## Repo layout

```
├── docs/
│   ├── autonomy-boundary.md      # the agent/human split, in full
│   ├── architecture.md           # batch vs. real-time, latency notes
│   ├── decision-log.md           # product calls made while building, with tradeoffs
│   └── what-i-didnt-build.md     # open problems, expanded
├── demo/                         # walkthrough video
└── src/                          # the app
```

---

*Built by [Carlos Abreu](https://www.linkedin.com/in/carlosabrx). Questions and disagreements welcome — especially about where the autonomy boundary should sit.*

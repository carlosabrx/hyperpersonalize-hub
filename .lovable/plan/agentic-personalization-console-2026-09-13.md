# Agentic Personalization Console

A public portfolio project: a working demo of the third Hightouch pillar — an agent that takes a growth goal in plain language and returns a ready-to-launch web personalization experiment, with a human approval gate.

Built as one deep project, framed so a cold visitor understands it in 30 seconds.

## The story a visitor sees

1. **Landing** — one screen: the problem (8 experiments a quarter vs 50), what the console does, and a "Try the demo" button. No signup.
2. **Console** — the growth lead types a goal, e.g. "lift loyalty signups among high-spend repeat buyers on the account page".
3. **Agent run** — visible step-by-step, streamed as it thinks:
   - *Audience*: proposes a segment against the sample customer data, shows the matching rules and how many customers qualify.
   - *Content*: drafts 2–3 on-brand variants for the surface, citing the brand rules and prior winners it drew on.
   - *Experiment*: sets traffic split, holdout, success metric, and the minimum sample it needs.
4. **Approval gate** — nothing goes live until the human clicks Approve. They can edit the audience, swap a variant, or send it back with a note.
5. **Live surface** — a fake product page where you pick a sample customer and see the personalized page they'd get, with the decision trace ("shown variant B because: high-spend, 4+ orders, holdout=no").
6. **Results** — simulated experiment readout: lift per variant, confidence, and the agent's recommendation (keep testing / declare winner / reallocate traffic).
7. **Case study page** — the product thinking behind it: what the agent owns vs the human, how trust is earned over time, sequencing, and the buyer. This is the page that does the interview work.

## Data

I'll invent a realistic retail dataset — roughly 500 sample customers with spend, order count, tenure, browse categories, loyalty status — plus a brand guideline record, an asset library of prior creative, and a history of past experiments with results. The agent grounds every proposal in these, and shows what it reused before generating anything new.

If you'd rather supply a dataset, say so and I'll fit the schema to it.

## Scope of the build

- Landing, console, live surface, results, case study.
- Agent run with visible reasoning, tool steps, and per-step editing.
- Approval workflow with an audit trail of who approved what and when.
- Saved experiments so a visitor's run persists and can be shared by link.
- Realtime-vs-batch panel on the live surface: shows the decision latency and what's precomputed vs evaluated on the fly.

Out of scope for v1: real traffic, real ad or ESP integrations, multi-user accounts.

## Technical notes

- Lovable + TanStack Start front end; Supabase for customers, brand context, assets, experiments, variants, approvals, and decision logs.
- Agent built on the AI SDK through Lovable AI: tools for `find_audience`, `search_assets`, `generate_variant`, `configure_experiment`, `analyze_results`. Variant generation and experiment config gated behind human approval.
- Personalization decision runs as a server endpoint so the latency panel measures something real.
- Results are simulated from a seeded model, clearly labeled as simulated — no invented performance claims presented as real.

## Order of work

1. Data model plus seeded sample retail data, brand rules, asset library, experiment history.
2. Personalization decision endpoint and the sample product surface.
3. Agent tools and the streamed run view.
4. Approval gate, audit trail, saved runs.
5. Results readout and the latency/batch panel.
6. Landing and case study pages, SEO metadata.

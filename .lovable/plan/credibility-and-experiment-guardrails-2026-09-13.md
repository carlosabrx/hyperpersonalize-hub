# Credibility and Experiment Guardrails

## Goal
Make the demo's claims match what it measures, reduce reviewer friction, and expose the safeguards and trade-offs behind the experiment workflow.

## Changes

### 1. Precise performance and architecture language
- Replace every sub-millisecond claim with the exact boundary: server-side JavaScript audience evaluation and deterministic assignment timing only, excluding data fetch, logging, and network latency.
- Clarify that the demo evaluates segment rules from preloaded customer data while the production pattern would precompute and cache segment membership.
- Audit the “What is real” section line by line and distinguish real server calls, persisted decisions, deterministic bucketing, generated proposals, and simulated data/results.

### 2. One-click goal presets
- Turn the homepage's three sample goals into buttons.
- A click will create the run immediately using the correct surface and open the staged workflow.
- Keep the console examples as editable presets for reviewers who want to adjust the goal first.

### 3. Peeking refusal and fast-forward
- Give every newly launched experiment an early state at 38% of its required sample.
- “Run the analysis” will refuse to interpret lift at that point and explain why no read is available.
- Add a clear “Fast-forward to required sample” action that generates the existing deterministic simulated readout only after the threshold is reached.
- Persist this progression on the run so refreshes and shared links retain the same state.

### 4. Action log
- Add a persisted action log for each run covering goal creation, audience proposal, content assembly, experiment configuration, human approval/change request, decisions, early-read refusal, fast-forward, and final readout.
- Show a plain table with timestamp, action, and ownership: “Agent,” “Human approval,” or “System.”
- Keep customer decision traces separate from the workflow action log.

### 5. What this doesn’t solve
- Add a concise section to the case study naming cold start for anonymous visitors, mid-session decision staleness, and multiple-comparison risk across segments.
- Frame these as explicit production gaps rather than implied capabilities.

## Technical details
- Add `sample_progress_pct` to runs and a dedicated `run_actions` table with public demo-safe read/write policies and explicit grants.
- Update server functions to enforce the sample gate and write action records at the source of each state change.
- Use the existing TanStack server-function flow; no client-only authority for approvals, decisions, or results.
- Add complete social metadata fields to each content page while touching them.
- Verify a fresh preset-created run through proposal, approval, early-read refusal, fast-forward, final readout, action-log entries, and mobile/desktop layouts.

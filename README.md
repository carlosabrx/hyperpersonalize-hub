# Agentic Growth Engine

i would like to build project(s) that closely resemble what hightouch is describing here. My available tech stack includes: Claude, Cursor, n8n, Google AI/Flow, Lovable, Supabase, PostHog, Railway, Resend, and Gamma. Brainstorm several ideas for me that provide the best value for this role.About Hightouch

Hightouch is an Agentic Marketing Platform powered by the industry-leading Composable CDP. With complete brand context, customer data, and performance history in one place, every marketer finally has the power to build and ship end-to-end campaigns themselves. Teams move faster, stay on brand, and get AI marketing that actually works.

Founded in 2019 and headquartered in San Francisco, Hightouch enables marketing teams to analyze performance, brainstorm ideas, and generate creative at a speed and quality that wasn't previously possible.

Named a Leader in the 2026 Gartner® Magic Quadrant™ for Customer Data Platforms, Hightouch is trusted by leading enterprises like Domino's, Spotify, Aritzia, Cars.com, Ramp, and PetSmart.

At Hightouch, our mission is to help our customers leverage data and AI to grow their businesses. The team is ambitious, impact-driven, efficient — and we believe humility, kindness, and compassion are essential to our success. If you're energized by velocity, obsessed with raising the bar, and want to build alongside people who care deeply about each other and our customers, we'd love to meet you.

The Customer Problem

When you open Spotify, the homepage is different for every user. When you browse Nike's site, products are ranked by what Nike thinks you'll buy. When you log into Chase, offers are tailored to your spending. This is web and mobile personalization: deciding in real time what each customer sees inside your product. It directly moves conversion, retention, and revenue at the point where customers are already engaged.

Almost nobody does it well outside of companies that build it from scratch. A single experiment (testing whether high-spend users convert better seeing a loyalty upsell on the account page) requires an analyst to build the segment, a PM to write targeting rules, a designer to create variants, an engineer to instrument the test, and someone to monitor results. Most teams run 5–10 per quarter and end up with a handful of static rules covering a fraction of their users.

The tools that exist (Optimizely, Adobe Target) handle infrastructure but don't solve the coordination problem. Every experiment, audience, and piece of content still requires manual configuration. They also force companies to duplicate customer data into a proprietary store, adding months of implementation and permanent vendor lock-in.

Why Agents are the Solution

The shift from "AI assists a step" to "AI owns a workflow" is already happening in software engineering. Personalization is ready for the same shift.

Today: A growth team testing whether high-intent visitors convert better with a comparison page spends 2–4 weeks coordinating across tools and people. They run maybe 8 experiments that quarter.

With agents: The growth lead describes the goal. An agent identifies the audience from existing customer data, generates variants informed by past performance, configures the experiment with holdout groups, launches it, monitors significance, and reallocates traffic. The human reviews before launch. Calendar time: hours. The same team runs 50+ experiments per quarter because the coordination cost drops to nearly zero.

Agents handle the full chain as one workflow: audience, content, experiment, optimization. Instead of a bunch of manual steps, agents rethink this as a continuously improving closed loop.

Why Hightouch, Why Now

More than 1,000 enterprises—like Domino’s, Chime, Spotify, Ramp, Whoop, Grammarly, use Hightouch to run their marketing. Earlier this year we launched the Agentic Marketing Platform with two pillars:

Agentic Advertising Studio. Agents analyze performance, competitor creative, and brand guidelines, then assemble ad concepts across Meta, Google, TikTok, and LinkedIn.

Agentic Lifecycle Studio. Agents identify lifecycle opportunities, draft audiences, assemble on-brand email and SMS campaigns, and orchestrate them through Braze, Iterable, Salesforce, and Adobe.

Advertising covers paid media. Lifecycle covers email, SMS, and push. Agentic Personalization is the third pillar: what customers experience inside the website and mobile app. Different buyer (product and growth teams), different workflow (real-time experimentation), different technical surface (browser SDKs and edge delivery). Same agent infrastructure and data foundation.

What no competitor can replicate:

Agent orchestration. 25+ specialized skills for audience building, content generation, campaign analysis, and multi-step workflow coordination.

Content assembly. Agents search existing asset libraries for reusable on-brand content before generating anything new, which is what makes output trustworthy enough for enterprises to ship.

Marketing and brand context. Persistent layer connecting customer data, brand guidelines, creative assets, and performance history so agents operate grounded in how the business works.

Real-time data infrastructure. Low-latency personalization API, sub-second audience evaluation, ML-powered optimization and recommendations, event pipeline processing millions of events daily.

The Role

Founding Product Manager for Agentic Personalization: Hightouch's third major pillar and biggest new investment. You define the product, the sequencing, and the go-to-market.

Customer discovery. Deep engagement with product and growth teams at enterprise companies to understand how they personalize web and mobile today, and what would earn their trust in an agent-driven approach. Translate into a roadmap tied to revenue milestones.

Define the agent experience. What agents do autonomously (segments, variants, experiments, traffic allocation) vs. what needs human approval (production launches, brand-sensitive content). Design the feedback loop that builds trust over time.

Scale the GTM. Co-own pipeline, join customer calls, shape competitive positioning, partner with CS on implementation playbooks.

High-visibility role working directly with founders and executive team.

What We're Looking For

Zero-to-one track record. Products you built from nothing to meaningful revenue, ideally at a B2B SaaS company. Domain matters less than evidence you can find product-market fit under uncertainty.

Technical depth. Can evaluate architectural tradeoffs, debate infrastructure decisions with senior engineers, and reason about things like batch vs. real-time and caching strategies at the level of product decisions.

Commercial instinct. Think in terms of pipeline, conversion, and expansion. Build roadmaps that map to revenue targets.

Speed. Small team, high autonomy, tight cycles. We use AI heavily in our own workflows.

Cross-functional trust. This spans engineering, design, sales, CS, and leadership. You drive clarity from ambiguity.

We are looking for talented, intellectually curious, and motivated individuals who are interested in tackling the problems above. This is a senior role, but we focus on impact and potential for growth more than years of experience. The salary range for this position is $240,000 - $320,000 USD per year, which is location independent in accordance with our remote-first policy. We also offer meaningful equity compensation in the form of ISO options, and offer early exercise and a 10 year post-termination exercise window.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hyperpersonalize-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/20179bf6-ac38-47c8-af6d-17064340d9f4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

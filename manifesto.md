# Config Deserves Better

*Draft — working domain: configdeservesbetter.dev*

Settings matter. Many production changes don't come from code. They come from configuration: business rules, feature flags, menus, prices, rate limits, tenant settings, connection details. Yet configuration often gets less design, less testing and less tooling than the code it controls.
<!-- TODO: back this up with a source, e.g. the Google SRE book on changes to live systems causing outages, or "Holistic Configuration Management at Facebook" (2015). Check exact wording before quoting. -->

We already know how to change code safely: proposals, diffs, review, tests, history, revert, blame. Configuration runs the same production systems, yet much of it changes through a save button that writes straight to a live database. Configuration as code showed us what a good change process looks like. We want that process for *all* configuration, whichever interface a change comes through, without forcing everyone into git.

Good configuration design is application design. Before anyone can build a settings screen, someone has to decide which concepts exist, which combinations make sense, who owns what, and what a change means for an application that is already running. Those decisions shape the domain model, the architecture and the code. The screen is only where users run into them.

## What we mean by configuration

This manifesto is about the configuration people use to control how a product behaves: through settings screens, APIs, configuration files or automation.

Who those people are depends on what you build:

- **SaaS products:** tenant admins and end users setting up how the product works for them.
- **Open source products:** the people who install, run and tune your software.
- **Internal developer platforms:** developers configuring their own applications and environments.

Context decides what counts. A memory limit is an implementation detail in a SaaS product, but on an internal developer platform it may be exactly the decision your users need to make. The question is not *how deep* a setting goes, but *who* controls it, and what happens when they change it.

Configuration is shared work. Product managers, designers, developers, architects, testers, security and operations all shape it, and every principle below touches more than one of them.

These are the principles we believe in. They make four promises: configuration is **designed**, **safe to change**, **accountable** and **open to every actor**.

---

## Designed

### 1. Configuration deserves deliberate design
<!-- relevant: product, design, development, architecture -->

**Now:** Settings pile up one `if` statement at a time. Names drift, combinations nobody intended become possible, and nobody knows which settings still matter.

**Better:** Name the concepts, define their behavior, decide the boundaries and plan how they evolve, with the same care as any other part of the domain model.

### 2. Every setting has a cost
<!-- relevant: product, design, development, testing -->

**Now:** A setting gets added because a decision was hard, and it never leaves.

**Better:** Every setting earns its place. Each one adds a concept to understand, combinations to test and a compatibility promise to keep. It has an owner and a carefully chosen name. When it is no longer needed, it is deprecated and migrated with care: removing it can break someone's workflow even when the code change is trivial.

### 3. Configuration has a schema
<!-- relevant: development, architecture, testing -->

**Now:** Stringly-typed environment variables and JSON blobs that fail at boot, or worse, at 3 a.m.

**Better:** Configuration is typed, and every change is validated before it can become active, not when the application trips over it. A schema checks structure; whether a valid value also behaves well is a matter for testing.

### 4. Configuration evolves with the application
<!-- relevant: development, architecture, product, operations -->

**Now:** The application changes every week, and with AI writing more of the code, every day. Its configuration can't keep up: either nobody dares touch the schema, or a field is renamed and stored settings, scripts and pipelines break on the next deploy.

**Better:** Schema changes are planned like API changes. The schema is versioned, existing configuration is migrated rather than abandoned, and an old version keeps working while its users move to the new one. Deprecation is visible wherever someone reads or writes the setting: in the UI, in API responses, in a pipeline's output and in an agent's context, with a replacement and a date. Removal is the last step, not the first.

### 5. Configuration explains itself
<!-- relevant: development, architecture, design -->

**Now:** A field called `mode` accepts 1, 2 or 3. The person who knew what they mean left last year, and an AI agent has to guess.

**Better:** Settings describe their meaning, defaults, valid values, dependencies and impact in a form both people and machines can read. A schema says what is valid; this says what a change will do. Neither a new colleague nor an agent should have to guess what a field does.

## Safe to change

### 6. A change is a proposal before it's a fact
<!-- relevant: testing, product, development, operations -->

**Now:** Either the save button writes straight to production and the first test is your customers, or every small change waits for the next release.

**Better:** A change can be proposed, previewed and tested before it takes effect: a diff of what will change, a dry run, a test outside production, review where it matters. Tests cover what a schema can't: how a valid value behaves with real data and in combination with the settings around it. How much of this a change needs depends on the setting, the value and the context: a rate limit going from 100 to 110 is not the same as 100 to 100 million. Define that policy beforehand and assess every proposal against it. Safe doesn't mean slow: configuration goes live independently of application builds, with explicit rules for when a change takes effect.

### 7. Previous configuration can be restored
<!-- relevant: operations, development -->

**Now:** Going back means reconstructing the old value from memory or a screenshot.

**Better:** Previous states are recorded, and restoring one is a normal operation, not an incident. Restoring configuration doesn't undo what already happened under it, so the consequences of a change are part of designing it. Nor does it bring back a revoked credential: secrets are rotated, not restored.

## Accountable

### 8. Configuration follows least privilege
<!-- relevant: security, product -->

**Now:** If you can log in to the admin panel, you can change everything.

**Better:** Access is granted per resource, or even per field: who may change *what*, not just who may get in. People, services and agents each have their own identity, and an agent acting on someone's behalf stays within the authority it was explicitly given.

### 9. No anonymous changes, no unexplained changes
<!-- relevant: development, security, operations, product -->

**Now:** Something changed. The audit log says "admin", and nobody knows why.

**Better:** Every change records who, what, when *and why*. The why points to something people can follow: a ticket, a request, an incident, or the policy or automation that triggered it. When an agent or service acts on someone's behalf, both are recorded: who asked, and what made the change.

### 10. Secrets stay secret
<!-- relevant: security, operations -->

**Now:** Secrets in plain text in repositories, CI logs and environment dumps.

**Better:** Secret values are exposed only to authorized consumers, for only as long as they need them. Access is auditable without recording the secret itself.

## Open to every actor

### 11. The GUI is one client, not the only way in
<!-- relevant: development, architecture, operations, product -->

**Now:** The settings screen is the only way in. Other teams click through forms, script against undocumented endpoints, or give up.

**Better:** Everything the UI can do, a documented API can do, because the UI uses that same API. Changes can be described declaratively and applied repeatedly with the same result, so teams can bring them into the tools they already use: GitOps, an OpenTofu provider, Kubernetes resources, an SDK. You don't have to build all of them; you have to make them possible, and ideally ship the one your users need most.

### 12. Many writers, one set of rules
<!-- relevant: architecture, operations, security -->

**Now:** A change made in the UI is overwritten by the next deploy. The git repository and the running system drift apart, and nobody can say which one is right.

**Better:** People, pipelines and agents all go through the same path: the same validation, permissions, review rules and audit trail, whichever interface they use. For every setting it is clear who is in charge. A setting managed from git shows up as such in the UI. Desired and applied state may differ for a while, during review or rollout, but drift is detected and shown to the people who can resolve it.

### 13. Conflicts are detected, not silently overwritten
<!-- relevant: development, design -->

**Now:** Two people edit the same setting, and the last write wins without anyone noticing.

**Better:** A concurrent change is detected and resolved explicitly: by a person, or by a strategy agreed on beforehand. That holds for a person and a pipeline just as much as for two people.

---

## It depends, but you still decide

How you apply these principles depends on your product, your users and the impact of a change. A security officer, an architect, a product manager and a team validating an idea will weigh them differently, and often the right answer differs per setting within one product. So these are not thirteen features to tick off. They are questions every team should answer deliberately, and own the answers to, even when the answer is "not yet" or "not for this setting".

Making those choices costs engineering time, and settings, permissions and audit logs rarely win the prioritization against features customers pay for. Too often, the budget picks the trade-off instead of the team. Better foundations can reduce that cost: they can take care of validation, access control, history and concurrency. They can't decide what your configuration means. That design work stays with the team.

---

*Configuration deserves deliberate design. The teams who build it deserve better tools.*

Related: [reversegitops.dev](https://reversegitops.dev/), a better write path for GitOps.

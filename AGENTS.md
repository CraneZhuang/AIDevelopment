# AGENTS.md

Guidance for agents working in this repo.

## Agent skills

This repo uses [Matt Pocock's engineering skills](https://github.com/mattpocock/skills), installed under `.agents/skills/` (25 skills, MIT). Run `/ask-matt` to find the right one for a situation, or `/grill-me` before starting a change.

Do not edit files under `.agents/skills/` casually: they are a vendored copy, and local edits are lost on re-install.

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, plus `docs/adr/`. See `docs/agents/domain.md`.

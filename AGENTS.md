# AGENTS.md

Guidance for agents working in this repo.

## Agent skills

This repo uses [Matt Pocock's engineering skills](https://github.com/mattpocock/skills), installed under `.agents/skills/` (25 skills, MIT). Run `/ask-matt` to find the right one for a situation, or `/grill-me` before starting a change.

Those 25 are a vendored copy, so local edits to them are lost on re-install. `dispatch-tickets` is this repo's own and is meant to be edited.

### Issue tracker

Issues and specs live as GitHub issues on `CraneZhuang/AIDevelopment`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Ticket dispatch

Ready tickets go to parallel worker agents, one git worktree each. Run `/dispatch-tickets`, or read `docs/agents/orchestration.md` for the contract and `docs/agents/ticket-runbook.md` for the per-ticket pipeline.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, plus `docs/adr/`. See `docs/agents/domain.md`.

---
name: dispatch-tickets
description: Dispatch the ready tickets on the issue tracker to parallel worker agents, each in its own git worktree, then collect their PRs. Use when tickets are labelled ready-for-agent and the user wants them built, or asks to dispatch, parallelise, or work the frontier.
---

Read [orchestration.md](../../../docs/agents/orchestration.md) and follow it. It is the authoritative contract for the frontier query, isolation, dispatch, retry, and collection.

Everything below is what the orchestration doc does not carry.

## Before dispatching

Read [ticket-runbook.md](../../../docs/agents/ticket-runbook.md) once. You pass its text to every worker, so you need it in context before the first dispatch.

## Sizing the run

Dispatch the frontier as background agents and continue. Collect them as they settle rather than waiting on the batch.

Cap concurrent workers at the harness's limit and queue the remainder.

## Per ticket

1. Query the tracker for the ticket, its Agent Brief comment, and its open blocker count.
2. Pick the branch and worktree names from the ticket number and slug.
3. Compose the worker prompt: ticket content, Agent Brief, paths, project check commands, and the runbook text.
4. Dispatch it.

Verify the worktree exists before the worker starts. A worker that cannot find its worktree will edit the shared checkout instead, which is the failure the isolation rule exists to prevent.

## After collection

Report the table and the human-action list, then stop. Merging is the human's call.

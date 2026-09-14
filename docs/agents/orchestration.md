# Orchestration

How this repo dispatches a set of ready tickets to parallel worker agents, and what it does with what comes back.

This is the contract the `dispatch-tickets` skill executes. The workers' side of it lives in [ticket-runbook.md](./ticket-runbook.md).

## The frontier

The ticket graph lives on the issue tracker. A ticket's blocking edges are GitHub's native issue dependencies, written by `/to-tickets` when it published them.

The **frontier** is the set of tickets that can start right now:

1. `gh issue list --state open --label ready-for-agent`
2. Keep the tickets whose open blockers are zero: `issue_dependencies_summary.blocked_by` is `0`.
3. Drop the tickets already assigned; an assignee means somebody has claimed it.

This replaces the original design's ready/blocked/hitl queues. The tracker already holds the graph, so a queue is a query rather than a structure to maintain, and `blocked` needs no label of its own.

## Dispatch

Dispatch the whole frontier in one pass, one agent per ticket.

Each dispatch prompt is **self-contained**, because a fresh worker inherits none of this conversation:

- the ticket's number, title, body, and Agent Brief comment
- the worktree path and branch name assigned to it
- the project check commands
- the full text of [ticket-runbook.md](./ticket-runbook.md)

Read the runbook and paste it in rather than pointing at it. A worker that has to fetch its own instructions spends a turn on something the dispatcher already has in context.

### Isolation

Every ticket gets one worktree and one branch:

- branch: `issue/<number>-<slug>`
- worktree: `.worktrees/issue-<number>-<slug>`

Workers run in parallel and inherit the same working directory, so the worktree is what keeps them apart. Two workers editing one checkout corrupt each other's commits and test runs.

A worker addresses its worktree explicitly (`git -C <path>`, or absolute paths) because shell calls do not share a working directory between invocations and workers cannot be handed a different `cwd` at spawn time.

### Sizing

Dispatch at most the harness's concurrent agent limit at once; queue the rest. The frontier is often smaller than the limit, since blocking edges rarely leave many tickets free together.

## Collection

Each worker ends with a report block:

```
status: success | failed | needs-clarification
issue: <number>
branch: <branch name>
pr_url: <url, or empty>
blocking_findings: <count>
error: <one line, or empty>
```

As workers settle, record each one and clean up its worktree. A finished worktree holds nothing the branch and PR do not already have.

## Retry

There is no retry counter in the harness, so retries are explicit decisions rather than a configured number.

| Report | Action |
| --- | --- |
| `success` | Record the PR. Nothing to retry. |
| `failed` on a code defect | Dispatch once more with the failure appended to the prompt. One retry, then report to the human. |
| `failed` on infrastructure | Dispatch again unchanged; the previous attempt's environment was the problem. |
| `needs-clarification` | Route to the human. Re-dispatching without an answer reproduces the same stop. |

The same ticket failing twice is information: the spec or the seams are wrong, and another worker will rediscover that at the same cost.

## Human gates

Two decisions stay with the human, and dispatch does not automate past them:

- **Seams.** A worker that finds no agreed seams stops and reports. Seam agreement happens before dispatch, through `/to-spec` or a triage brief.
- **Merge.** Workers open PRs. Merging is the point where the work becomes main, so it follows CI and review rather than substituting for them.

## Summary

Close the run with a table of `issue`, `status`, `pr_url`, and `attempts`, then a list of tickets needing a human. The old design's closing statistics (total, succeeded, failed, retries) reduce to this table's shape.

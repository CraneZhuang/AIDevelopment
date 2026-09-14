# Ticket Runbook

One ticket, one branch, one PR. This is the pipeline a worker agent runs to take a single ticket from `ready-for-agent` to an open pull request.

The dispatcher hands you this document inline along with the ticket. You do not need to load it yourself.

## Inputs

The dispatch prompt carries:

- **issue number and title**: the ticket on GitHub
- **worktree path and branch name**: your isolated workspace
- **project checks**: the exact commands for typecheck, test, and build

## Phase 0: Environment

Create the isolated workspace. Each ticket gets its own worktree so parallel workers never touch the same files.

1. `git worktree add <worktree path> -b <branch name>`
2. Run every subsequent command with an explicit working directory: `git -C <worktree path> ...`, or an absolute path into the worktree. Shell calls in this harness do not share a working directory, so each command must carry its own.

**Done when**: `git worktree list` shows the worktree, and `git -C <worktree path> branch --show-current` prints the branch name.

## Phase 1: Read the spec

Read the issue body and its comments. The **Agent Brief** comment is the authoritative contract; the original body and discussion are context.

**Done when**: you can state the acceptance criteria count and the Out of scope list without re-reading.

## Phase 2: Confirm the seams

A **seam** is the public boundary you test at. Tests live at seams, never against internals.

Read the seams the ticket already declares. `to-spec` and `to-tickets` record them; the Agent Brief names the interfaces under test.

**Done when**: every seam you intend to test appears in the ticket or brief.

If the ticket names none, **stop and report `status: needs-clarification`**. Seam agreement is a human decision, and you cannot ask a question mid-run. Writing tests at a seam nobody agreed to is the failure this gate exists to prevent.

## Phase 3: Red then green

Run the loop once per acceptance criterion, one seam at a time.

1. **Red**: write a test for the next criterion, run it, and watch it fail for the right reason.
2. **Green**: write the least code that makes it pass. One criterion, one minimal implementation.
3. Repeat until every acceptance criterion has a test that passes.

Each cycle cuts a complete path through the layers the ticket touches, so a finished cycle is verifiable on its own.

Read `.agents/skills/tdd/tests.md` and `.agents/skills/tdd/mocking.md` for what makes a test worth keeping. The two tells of a bad test: it breaks when you refactor without changing behavior, or its expected value is computed the same way the code computes it.

**Done when**: every acceptance criterion maps to a passing test, and you can name the test for each.

## Phase 4: Project checks

Run the three project checks the dispatch prompt supplied: typecheck, test suite, build. Run them from the worktree.

**Done when**: all three exit zero.

A failure here returns you to Phase 3. Fix the cause; re-running a failing command unchanged belongs to the infrastructure case in Phase 5, not this one.

## Phase 5: Two-axis review

Read `.agents/skills/code-review/SKILL.md` and follow it. It reviews the diff along two axes, Standards and Spec, in parallel sub-agents, and it knows how to reach the issue tracker for the spec. Point it at `main` as the fixed point.

Act on what it returns:

- **Blocking findings**: return to Phase 3, fix, and re-run Phases 4 and 5.
- **Suggestions**: fold in what is cheap and in scope; list the rest in the PR body.

**Done when**: both axes have reported and zero blocking findings remain.

## Phase 6: Deliver

1. Commit to the branch in the worktree.
2. `git push -u origin <branch name>`
3. Open the PR with `gh pr create`, linking the issue. Use a body that carries the acceptance criteria as a checklist, the review summary, and the check results.

**Done when**: `gh pr view` prints a URL for the branch.

The PR is the handoff point. Merging is a human decision; CI and review exist to inform it.

## Report

End your run with this block, so the dispatcher can parse it:

```
status: success | failed | needs-clarification
issue: <number>
branch: <branch name>
pr_url: <url, or empty>
blocking_findings: <count>
error: <one line, or empty>
```

`needs-clarification` is the honest result for a ticket whose acceptance criteria contradict each other, whose seams are unconfirmed, or whose spec is missing. Report it and stop; a guess costs more than a question.

## Failure taxonomy

| Signal | Class | Action |
| --- | --- | --- |
| Test fails, type error, lint error, behavior wrong | Code defect | Return to Phase 3 |
| Dependency fetch fails, network error, transient command failure | Infrastructure | Re-run that one command |
| Acceptance criteria contradict, seams unnamed, spec absent | Spec gap | Report `needs-clarification` and stop |
| Review raises a blocking finding twice | Design problem | Report `failed` with the finding; a third pass repeats the same mistake |

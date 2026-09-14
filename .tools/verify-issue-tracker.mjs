// One-shot end-to-end verification of the GitHub issue-tracker wiring.
// Run from the repo root: node .tools/verify-issue-tracker.mjs
// Creates a temporary issue, exercises every read path a skill uses, then deletes it.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runAsync = promisify(execFile);
// Async spawn keeps the event loop free, so fetch() works in the same script.
const run = async (args) => (await runAsync('gh', args, { encoding: 'utf8' })).stdout.trim();
const runJson = async (args) => JSON.parse(await run(args));

const steps = [];
function check(name, ok, detail = '') {
  steps.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let num;
try {
  // 1. create (the write path /to-tickets and /to-spec use)
  const url = await run([
    'issue', 'create',
    '--title', 'verify: issue tracker wiring',
    '--body', 'Temporary issue from the setup verification. Safe to delete.',
    '--label', 'needs-triage',
  ]);
  num = Number(url.split('/').pop());
  check('gh issue create --label needs-triage', Number.isInteger(num) && num > 0, 'issue #' + num);

  // 2. view by number (the "fetch the relevant ticket" path)
  const viewed = await runJson(['issue', 'view', String(num), '--json', 'number,title,labels,state']);
  const names = viewed.labels.map((l) => l.name);
  check('gh issue view <n> --json', viewed.number === num, 'state=' + viewed.state);
  check('label string matches triage-labels.md', names.includes('needs-triage'), 'labels=' + names.join(','));

  // 3. list by label (the pickup query /triage runs). gh filters via the search
  //    API, which is eventually consistent, so allow a short settle window.
  let hit;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const listed = await runJson([
      'issue', 'list', '--state', 'open', '--label', 'needs-triage',
      '--json', 'number,title,labels',
    ]);
    hit = listed.find((i) => i.number === num);
    if (hit) { check(`gh issue list --label needs-triage finds it (attempt ${attempt})`, true); break; }
    await sleep(attempt * 2000);
  }
  if (!hit) check('gh issue list --label needs-triage finds it', false, 'still not returned after ~40s');

  // 4. relabel (the transition /triage performs)
  await run(['issue', 'edit', String(num), '--add-label', 'ready-for-agent', '--remove-label', 'needs-triage']);
  const after = await runJson(['issue', 'view', String(num), '--json', 'labels']);
  const afterNames = after.labels.map((l) => l.name);
  check('gh issue edit --add-label/--remove-label',
    afterNames.includes('ready-for-agent') && !afterNames.includes('needs-triage'),
    'labels=' + afterNames.join(','));
} finally {
  if (Number.isInteger(num)) {
    try { await run(['issue', 'close', String(num), '--comment', 'Verification complete.']); } catch { /* already closed */ }
    try { await run(['issue', 'delete', String(num), '--yes']); } catch { /* best effort */ }
  }
}

// 5. confirm the tracker is clean again (unfiltered, so no search lag applies)
const open = await runJson(['issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number']);
check('temporary issue removed, tracker clean', open.length === 0, 'open=' + open.length);

// 6. Node's own TLS path. This is the fallback for git, whose schannel backend is
//    what fails under the file sandbox. Unauthenticated GitHub API returns 404 for
//    a private repo, so probe TLS on the public host instead.
try {
  const r = await fetch('https://api.github.com/zen', { headers: { 'User-Agent': 'dsh-verify' } });
  const body = await r.text();
  check('Node fetch reaches GitHub (git 联网失败时的退路)', r.ok && body.length > 0, `HTTP ${r.status} "${body}"`);
} catch (error) {
  check('Node fetch reaches GitHub', false, error.message);
}

// 7. gh REST path against the private repo, which is what skills actually use
try {
  const full = await run(['api', 'repos/CraneZhuang/AIDevelopment', '--jq', '.full_name']);
  check('gh api reaches the private repo', full === 'CraneZhuang/AIDevelopment', full);
} catch (error) {
  check('gh api reaches the private repo', false, error.message);
}

const failed = steps.filter((s) => !s.ok).length;
console.log(`\n${steps.length - failed}/${steps.length} passed`);
process.exit(failed ? 1 : 0);

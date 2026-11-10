import {cpSync, mkdtempSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {root, git, repository, runNode, githubApi} from './github-pages.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--no-build')) throw new Error('Usage: node tools/deploy-gallery-pages.mjs [--no-build]');
const repo = repository(), branch = 'gh-pages', api = githubApi();
const configured = await api(`repos/${repo.slug}/pages`, 'GET', undefined, true);
if (configured?.build_type === 'workflow') throw new Error('Pages is managed by GitHub Actions. Push main to deploy; use npm run build:pages for a local preview.');
if (!args.includes('--no-build')) runNode([resolve(root, 'tools/build-gallery-pages.mjs')]);
const dist = resolve(root, 'gallery/dist-pages');
const build = JSON.parse(readFileSync(resolve(dist, 'pages-build.json'), 'utf8'));
if (build.repository !== repo.slug || build.base !== repo.base) throw new Error('Pages build does not match origin; run npm run build:pages');
const metadata = await api(`repos/${repo.slug}`);
if (!metadata.permissions?.push) throw new Error(`No push permission for ${repo.slug}`);
const out = resolve(root, 'out'); mkdirSync(out, {recursive: true});
const publish = mkdtempSync(join(out, 'pages-publish-'));
git(['init', '--initial-branch', branch], publish);
git(['remote', 'add', 'origin', repo.remote], publish);
const existing = git(['ls-remote', 'origin', `refs/heads/${branch}`], publish);
if (existing) {
  git(['fetch', '--depth=1', 'origin', branch], publish);
  git(['checkout', '-B', branch, 'FETCH_HEAD'], publish);
  // This isolated directory was just created inside out; clear its tracked
  // artifact files without touching the shared source working tree.
  git(['rm', '-r', '--ignore-unmatch', '--', '.'], publish);
}
cpSync(dist, publish, {recursive: true});
git(['config', 'user.name', git(['config', 'user.name'], root, true) || 'WinUI Gallery deployment'], publish);
git(['config', 'user.email', git(['config', 'user.email'], root, true) || 'gallery-deploy@users.noreply.github.com'], publish);
git(['add', '--all'], publish);
if (git(['diff', '--cached', '--name-only'], publish)) git(['commit', '-m', `Deploy Gallery (${build.wasmSha256.slice(0, 12)})`], publish);
const commit = git(['rev-parse', 'HEAD'], publish);
console.log(`Publishing ${repo.slug}:${branch} at ${commit}`);
git(['push', 'origin', `HEAD:refs/heads/${branch}`], publish);
let pages = await api(`repos/${repo.slug}/pages`, 'GET', undefined, true);
const configuration = {build_type: 'legacy', source: {branch, path: '/'}};
if (!pages) pages = await api(`repos/${repo.slug}/pages`, 'POST', configuration);
else if (pages.source?.branch !== branch || pages.source?.path !== '/' || pages.build_type !== 'legacy') pages = await api(`repos/${repo.slug}/pages`, 'PUT', configuration);
await api(`repos/${repo.slug}/pages/builds`, 'POST');
let previous;
for (let attempt = 0; attempt < 90; attempt++) {
  const latest = await api(`repos/${repo.slug}/pages/builds/latest`, 'GET', undefined, true);
  const status = `${latest?.commit ?? 'pending'}:${latest?.status ?? 'queued'}`;
  if (status !== previous) {console.log(`Pages build: ${status}`); previous = status;}
  if (latest?.commit === commit && latest.status === 'errored') throw new Error(`Pages build failed: ${latest.error?.message ?? 'check repository Actions'}`);
  if (latest?.commit === commit && latest.status === 'built') {
    pages = await api(`repos/${repo.slug}/pages`);
    const url = pages.html_url;
    const response = await fetch(url, {signal: AbortSignal.timeout(30000), cache: 'no-store'});
    if (response.ok && (await response.text()).includes('WinUI Gallery')) {console.log(`Deployed: ${url}`); process.exit(0);}
  }
  await new Promise(resolve => setTimeout(resolve, 10000));
}
throw new Error('Pages deployment is still pending; inspect repository Pages/Actions before redeploying');

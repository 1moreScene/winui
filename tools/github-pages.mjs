import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function git(args, cwd = root, allowFailure = false) {
  const result = spawnSync('git', args, {cwd, encoding: 'utf8', windowsHide: true,
    env: {...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never'}});
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw new Error(`git ${args[0]} failed: ${result.stderr}`);
  return result.status === 0 ? result.stdout.trim() : null;
}
export function repository() {
  const target = process.env.GITHUB_PAGES_REPOSITORY;
  const remote = target ? `https://github.com/${target}.git` : git(['remote', 'get-url', 'origin']);
  const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) throw new Error('origin or GITHUB_PAGES_REPOSITORY must identify a github.com owner/repository without embedded credentials');
  const [, owner, name] = match;
  const base = name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${name}/`;
  return {owner, name, base, remote, slug: `${owner}/${name}`};
}
export function runNode(args, cwd = root) {
  const result = spawnSync(process.execPath, args, {cwd, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed: ${args[0]} (exit ${result.status})`);
}
export function githubApi() {
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    const result = spawnSync('git', ['-c', 'credential.interactive=false', 'credential', 'fill'], {
      cwd: root, input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', windowsHide: true,
      env: {...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never'},
    });
    const credential = Object.fromEntries((result.stdout ?? '').split(/\r?\n/).filter(line => line.includes('=')).map(line => {const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];}));
    token = credential.password;
  }
  if (!token) throw new Error('GitHub authentication is required: sign in with Git Credential Manager or supply GH_TOKEN with repository/Pages permissions');
  return async (path, method = 'GET', body, allowNotFound = false) => {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(`https://api.github.com/${path}`, {method, signal: AbortSignal.timeout(30000),
          headers: {'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'User-Agent': 'winui-gallery-pages-deploy', 'X-GitHub-Api-Version': '2022-11-28', 'Connection': 'close', ...(body ? {'Content-Type': 'application/json'} : {})},
          ...(body ? {body: JSON.stringify(body)} : {}),
        });
        break;
      } catch (error) {
        if (attempt === 2) throw new Error(`GitHub ${method} ${path}: network request failed (${error.cause?.code ?? error.message})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    if (response.status === 404 && allowNotFound) return null;
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status} ${data?.message ?? response.statusText}`);
    return data;
  };
}

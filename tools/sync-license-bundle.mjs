import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = name => JSON.parse(readFileSync(resolve(root, `third_party/${name}`), 'utf8'));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function syncLicenseBundle(destinations) {
  const resources = readJson('resource-manifest.json');
  const dependencies = readJson('dependency-licenses.json');
  const lines = [
    'WINUI WASM — THIRD-PARTY NOTICES',
    'Review date: 2026-11-10',
    'Project-authored code is MIT; third-party components retain their own licenses.',
    'This is an independent implementation and is not endorsed by Microsoft, GitHub, or other referenced owners.',
    'Names and trademarks remain the property of their respective owners. Open-source copyright licenses do not grant trademark rights.',
    'Windows system fonts and Windows App SDK binaries are not included or licensed by this notice.',
    resources.unresolved.length ? 'Unresolved permission findings block redistribution; see resource-manifest.json.' : 'Runtime templates and brushes are generated offline from pinned MIT WinUI source; see resource-manifest.json.',
    'lightningcss (MPL-2.0) is a build-only tool; compiler binaries, node_modules and their source are not shipped in the web/SDK artifacts.',
    '',
  ];
  const notices = new Map();
  for (const component of resources.components) {
    lines.push(`${component.id} — ${component.license}`, `Source: ${component.source}`, '');
    for (const file of component.notices) notices.set(file, resources.notices[file]);
  }
  for (const component of dependencies.components) {
    lines.push(`${component.ecosystem}: ${component.name} ${component.version} — ${component.license}`,
      `Source: ${component.source ?? component.repository ?? 'See dependency-licenses.json'}`, '');
    for (const notice of component.notices) notices.set(notice.path, notice.sha256);
  }
  for (const [file, expected] of notices) {
    const bytes = readFileSync(resolve(root, file));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`License text changed: ${file}`);
    lines.push(`\n========== ${file} ==========\n`, bytes.toString('utf8'));
  }
  const text = lines.join('\n') + '\n';
  writeFileSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), text);
  for (const destination of destinations) {
    const folder = resolve(root, destination);
    mkdirSync(folder, {recursive: true});
    writeFileSync(resolve(folder, 'THIRD_PARTY_NOTICES.txt'), text);
    for (const name of ['resource-manifest.json', 'dependency-licenses.json']) {
      writeFileSync(resolve(folder, name), readFileSync(resolve(root, `third_party/${name}`)));
    }
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WinUI WASM licenses</title><body><h1>Third-party licenses and resource sources</h1><p>Independent WinUI WASM implementation. No endorsement by the referenced owners.</p><p><strong>Redistribution review: ${resources.unresolved.length ? 'BLOCKED — engineering-preview resource provenance is unresolved' : 'no recorded unresolved findings'}.</strong></p><ul><li><a href="THIRD_PARTY_NOTICES.txt">Full license texts, copyright notices and modifications</a></li><li><a href="resource-manifest.json">Reviewed resource sources and hashes</a></li><li><a href="dependency-licenses.json">Dependency versions and license expressions</a></li></ul><ul>${resources.components.map(component => `<li>${escape(component.id)}: ${escape(component.license)} — ${escape(component.source)}</li>`).join('')}</ul></body></html>`;
    writeFileSync(resolve(folder, 'index.html'), html);
    writeFileSync(resolve(folder, '../RELEASE-STATUS.txt'), resources.unresolved.length
      ? 'NOT APPROVED FOR REDISTRIBUTION\nSDK-PREVIEW-001: Engineering-preview template provenance is unresolved.\nSee licenses/index.html and docs/resource-licensing.md.\n'
      : 'No recorded unresolved permission findings. See licenses/index.html for scope and conditions.\n');
  }
  console.log(`Synchronized complete license bundle to ${destinations.length} locations.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncLicenseBundle(process.argv.slice(2).length ? process.argv.slice(2) : ['gallery/public/licenses']);
}

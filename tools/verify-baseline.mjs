import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync(new URL('../references/baseline.json', import.meta.url), 'utf8'));
const tree = process.argv.includes('--source-tree') ? new Map(JSON.parse(readFileSync(new URL('../out/winui-tree.json',import.meta.url),'utf8')).map(entry=>[entry.path,entry.sha])) : null;
for (const file of manifest.winuiFiles) {
  const name = file.path.split(/[\\/]/).pop();
  const bytes = readFileSync(new URL(`../references/winui/${name}`, import.meta.url));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== file.sha256) throw new Error(`Pinned source hash mismatch: ${name}`);
  if(tree){
    const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if(tree.get(file.sourcePath)!==blob)throw new Error(`Pinned Git source path/blob mismatch: ${file.sourcePath}`);
  }
}
console.log(`Verified ${manifest.winuiFiles.length} pinned WinUI source files.`);
if(tree)console.log('Verified every source path against the pinned Git tree blob identity.');

if(process.argv.includes('--local')){
 for(const file of manifest.referenceFiles){const bytes=readFileSync(file.path);const hash=createHash('sha256').update(bytes).digest('hex');if(hash!==file.sha256)throw new Error(`Local baseline changed: ${file.path}`);}
 console.log(`Verified ${manifest.referenceFiles.length} local Gallery/SDK/probe/reference fingerprints.`);
}

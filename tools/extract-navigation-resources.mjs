// Compatibility entry; all resource generation is offline from verified MIT inputs.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync('python',['-X','utf8','tools/generate-mit-palettes.py'],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;

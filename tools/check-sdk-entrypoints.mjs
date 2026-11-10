import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {API} from '../packages/winui-wasm/node_modules/typescript/dist/api/sync/api.js';
import {auditReact} from './control-implementation-audit.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const components=auditReact(readFileSync(resolve(root,'packages/winui-wasm/src/react.tsx'),'utf8')).exports;

/** Inspect TypeScript's resolved module exports, including export-star chains,
 * using the actual declarations installed in the consumer. No editor settings. */
export function checkSdkEntrypoints(directory,{react=false}={}){
  const api=new API({cwd:directory});
  let snapshot;
  try{
    const config=resolve(directory,'tsconfig.json');
    snapshot=api.updateSnapshot({openProjects:[config]});
    const project=snapshot.getProject(config);
    assert(project,`TypeScript did not load ${config}`);
    const exportsOf=entry=>{
      const suffix=`/winui-wasm/dist/${entry}.d.ts`;
      const file=project.program.getSourceFileNames().find(name=>name.replaceAll('\\','/').endsWith(suffix));
      assert(file,`Consumer must resolve the installed ${entry} declarations`);
      const symbol=project.checker.getSymbolAtLocation(project.program.getSourceFile(file));
      return new Set(project.checker.getExportsOfModule(symbol).map(symbol=>symbol.name));
    };
    const core=exportsOf('index');
    for(const name of components)assert(!core.has(name),`Root SDK export ${name} competes with a React component`);
    for(const name of ['ButtonController','NavigationViewController','FrameController','ContentControlController','TableViewController'])assert(core.has(name),`Missing public controller ${name}`);
    if(react){
      const adapter=exportsOf('react');
      for(const name of components)assert(adapter.has(name),`Missing React component ${name}`);
      for(const name of ['ButtonController','ButtonVariant','ButtonOptions'])assert(adapter.has(name),`Missing shared React export ${name}`);
    }
    console.log(`SDK declarations passed: ${components.length} component names absent from root${react?', all present in React':''}; Controller exports available.`);
  }finally{
    snapshot?.dispose();
    api.close();
  }
}

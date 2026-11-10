import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditFrontend,auditReact} from './control-implementation-audit.mjs';

test('both retired navigation masks are rejected without relying on their names',()=>{
  for(const code of [
    '<div className="anything" onPointerDown={()=>view.update({isPaneOpen:false})}/>',
    '<div style={{position:"absolute",background:"#0003"}} onPointerDown={()=>view.update({isPaneOpen:false})}/>',
    '<div role="checkbox"/>',
    '<div onPointerDown={closePane}/>',
    'React.createElement("button",{})',
    'import {createElement as el} from "react"; el("button",{})',
    '<dialog/>',
  ])assert.ok(auditFrontend('example.tsx',code).length,code);
});
test('displayed code strings, business callbacks and page content remain legal',()=>{
  const code='const source = `<button onClick={click}/>`; const content=<><p role="status">Ready</p><div><Button onClick={()=>view.update({isPaneOpen:true})}/></div></>;';
  assert.deepEqual(auditFrontend('example.tsx',code),[]);
});
test('all current React adapters call the SDK; a registered name alone cannot pass',()=>{
  const text=readFileSync(new URL('../packages/winui-wasm/src/react.tsx',import.meta.url),'utf8');
  assert.deepEqual(auditReact(text).errors,[]);
  assert.ok(auditReact(text+'\nexport function PretendControl(){return null;}').errors.some(e=>e.includes('PretendControl')));
  assert.ok(auditReact(text+'\nexport const FakeControl=()=>null;').errors.some(e=>e.includes('FakeControl')));
  assert.ok(auditReact(text+'\nexport function Fake(){return <button/>;}').errors.some(e=>e.includes('control DOM')));
  assert.ok(auditReact(text.replace('created = parent.button(options);','created = parent.button(options); canvas.getContext("2d");')).errors.some(e=>e.includes('painting')));
});

test('only the reviewed public SDK wildcard can pass through the React entry',()=>{
  const text=readFileSync(new URL('../packages/winui-wasm/src/react.tsx',import.meta.url),'utf8');
  assert.deepEqual(auditReact(text).errors,[]);
  for(const code of [
    "export * from './scene';",
    "export * from 'another-control-library';",
    "export * as Controls from './index';",
    "export {Button} from './index';",
    "export {Button as CustomButton} from './scene';",
  ])assert.ok(auditReact(text+'\n'+code).errors.some(error=>error.includes('re-exports')),code);
});

"""Record the actual tested artifact, without treating shared-source drift as acceptance."""
from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, re
root=Path(__file__).resolve().parent.parent
def read(name): return json.loads((root/name).read_text(encoding='utf-8-sig'))
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
artifact=root/'out/menu-item-tested-dist-v3'
wasm=next((artifact/'assets').glob('*.wasm'))
wasm_sha=sha(wasm)
browser=read('out/menu-item-refinement-browser-results.json')
assert browser['stats']['expected']==20 and browser['stats']['unexpected']==0 and browser['stats']['skipped']==0
rust=(root/'out/menu-item-refinement-rust.log').read_text(encoding='utf-8-sig')
counts=[int(n) for n in re.findall(r'test result: ok\. (\d+) passed',rust)]
assert counts==[14,24,19,19],counts
comparison=read('references/menu-item-comparison.json')
assert comparison['wasmSha256']==wasm_sha
assert len(comparison['rows'])==28
assert all(r['accepted'] for r in comparison['rows'])
native=read('references/menu-item-native.json')
assert len(native['rows'])==20
sources=['src/scene/menu_presenter.rs','src/scene/menu_item_controls.rs','src/scene/menu_entries.rs','src/scene/overlays.rs','src/scene/mod.rs','src/scene/properties.rs','src/scene/layout.rs','src/scene/five_controls.rs','src/scene/input.rs','gallery/src/menu-item-types.ts','gallery/src/scene.ts','gallery/src/react.tsx','gallery/src/index.ts','gallery/src/MenuItemControlsPage.tsx','references/menu-item-template.json']
result=dict(recordedAt=datetime.now(timezone.utc).isoformat(),controls=['MenuFlyoutItem','ToggleMenuFlyoutItem','RadioMenuFlyoutItem','MenuFlyoutSubItem','MenuFlyoutSeparator'],
 implementation='Independent Rust scene nodes project into the shared Rust menu presenter; TS forwards typed configuration and callbacks; React mounts the same API.',
 refinements=['Child TextBlock physical-pixel measure budget','Template chevron glyph and part-specific state brushes','Native caption font, modifier order, capitalization, margins and per-item clipping','Pixel-aligned row accumulation and mirrored RTL columns','RTL Gallery option and typed FlowDirection API'],
 samples=5,route='/#menu-items',baseline=dict(winuiCommit=read('references/menu-item-controls-sources.json')['commit'],sdk=native['sdk'],verifiedNewSources=18,binarySourceCommitEquivalenceEstablished=False),
 validation=dict(rustPassed=sum(counts),newRustTests=14,rustLog='out/menu-item-refinement-rust.log',productionBrowserPassed=20,productionBrowserProjects=['Edge','WebKit'],renderers=['Canvas2D','WebGL2'],browserLog='out/menu-item-refinement-browser.log',nativeStates=20,nativeDpr=1.25,nativeGeometryCases=len(comparison['rows']),maxGeometryErrorDip=max(r['maxGeometryErrorDip'] for r in comparison['rows']),buildLog='out/menu-item-refinement-build.log',typescript='strict typecheck, enum negative cases and SDK declarations passed',productionBuild='Rust WASM release, Vite production build, declaration generation passed',gallerySourceAudit='No native HTML input/select/button/details/summary/option substitutes'),
 artifact=dict(directory=str(artifact.relative_to(root)),wasmSha256=wasm_sha,matchesCurrentGeneratedWasm=sha(root/'gallery/src/wasm/winui_bg.wasm')==wasm_sha,files={p.relative_to(artifact).as_posix():sha(p) for p in artifact.rglob('*') if p.is_file()}),
 postTestSourceSnapshot=dict(scope='Selected menu implementation and integration files after testing. This is not a claim that unrelated concurrent edits were compiled into the frozen artifact.',files={p:sha(root/p) for p in sources}),
 remaining=['Native source commit and NuGet binary equivalence is not established.','Static forced VSM geometry and composed probe images do not accept Store Gallery Composition or per-frame animation parity.','Composed images retain documented font rasterization and material differences; pixel parity is not accepted.','Radio grouping is scoped to one Rust Scene; native uses a thread-local map.'],
 evidence=['references/menu-item-controls-sources.json','references/menu-item-native.json','references/menu-item-probe-run.json','references/menu-item-comparison.json','references/menu-item-pixel-comparison.json'])
(root/'references/menu-item-status.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(rustPassed=sum(counts),productionBrowserPassed=20,nativeStates=20,wasmSha256=wasm_sha,matchesCurrentGeneratedWasm=result['artifact']['matchesCurrentGeneratedWasm']),indent=2))

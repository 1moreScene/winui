"""Record independently frozen Rust/WASM and browser refinement validation."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,re,gzip
ROOT=Path(__file__).resolve().parents[1]
def read(path):return (ROOT/path).read_text(encoding='utf-8-sig')
def obj(path):return json.loads(read(path))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
source='out/menu-layout-refinement-source-v4'
runtime='out/menu-layout-refinement-runtime-v4'
manifest=obj(source+'/source-manifest.json')
stamp=obj(runtime+'/build-stamp.json')
assert stamp['sha256']==sha(runtime+'/winui_bg.wasm')
rust_log='out/menu-refinement-final-v4-full-rust.log';rust=read(rust_log)
assert 'test result: FAILED' not in rust and not re.search(r'^error:',rust,re.M)
rust_count=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rust)))
assert rust_count>=315
def browser(log,count):
 text=read(log)
 assert re.search(rf'\b{count} passed\b',text) and not re.search(r'\b[1-9]\d* failed\b',text),log
 return {'passed':count,'log':log}
checks={path:sha(path)==manifest['files'][path] for path in ['src/scene/command_menus.rs','src/scene/menu_entries.rs','src/scene/layout_panels.rs','tests/menu_layout.rs','tests/animated_icon.rs']}
assert all(checks.values()),'Batch source changed after the frozen run'
data={
 'recordedAt':datetime.now(timezone.utc).isoformat(),
 'controls':['MenuBar','MenuBarItem','CommandBarFlyout','RelativePanel','WrapPanel'],
 'ownership':'Rust owns material recipes, control state, input, layout, transitions, scroll offsets and frame scheduling. TS adapts host events and typed handles; React supplies bindings and Gallery business callbacks.',
 'baselines':{'galleryCommit':'7360ac322414e118eadfb0c7c2f4ecc31a218f59','winuiCommit':'7b12709347527238494ca28cb9fed326d513e779','sdk':'Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental','native':'references/menu-layout-probe-run.json','cascading':'references/cascading-menu-sources.json'},
 'source':{'snapshot':source,'manifestSha256':sha(source+'/source-manifest.json'),'excluded':manifest['excluded'],'batchMatchesCurrent':checks,'currentDrift':[p for p,digest in manifest['files'].items() if p.startswith('src/') and (ROOT/p).exists() and sha(p)!=digest]},
 'runtime':{'folder':runtime,'sha256':stamp['sha256'],'bytes':(ROOT/runtime/'winui_bg.wasm').stat().st_size,'gzipBytes':len(gzip.compress((ROOT/runtime/'winui_bg.wasm').read_bytes()))},
 'gallerySource':{'snapshot':'out/menu-layout-refinement-app-verified','manifestSha256':sha('out/menu-layout-refinement-app-verified/source-manifest.json'),'matchesCurrentPage':sha('gallery/src/MenuLayoutPage.tsx')==sha('out/menu-layout-refinement-app-verified/MenuLayoutPage.tsx'),'referenceCapture':'A temporary in-progress repeater reference JSON was replaced in the final snapshot by its completed repository example data; the menu/layout page and SDK binding source remain frozen.'},
 'validation':{'fullRust':{'passed':rust_count,'log':rust_log},'menuLayoutTests':23,'animatedIconTests':8,'browser':browser('out/menu-refinement-v4-browser.log',32),'production':browser('out/menu-refinement-v4-production-browser.log',24),'typecheck':{'snapshot':'out/menu-layout-refinement-sdk-check','log':'out/menu-refinement-frozen-types.log'},'declarations':'out/menu-refinement-frozen-declarations.log','productionBuild':'out/menu-refinement-v4-production-build.log'},
 'animatedIcon':{'historicalRustFailure':'Not reproduced at the beginning of this refinement; original test plus removal at six transition times pass in the final frozen full run.','browserFailure':'Stale HTML details locator replaced with actual Rust Expander header interaction.','scheduler':'Scope picker/command/view/repeater/refresh activity to owning control kinds; preserve generated More-button motion.'},
 'remaining':['Store Gallery Composition material/shadow/frame-by-frame acceptance is not established by the independent static same-SDK probe.','WrapPanel explicit-size Last overflow and vertical Last edge geometry remain recorded native differences.','Full diagonal submenu grace-area boundaries and touch inertia/scrollbar template differential coverage remain incomplete.','Extreme RelativePanel constraint combinations and full native UIA Provider behavior are not exhaustively compared.'],
}
(ROOT/'references/menu-layout-refinement-status.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print(f'Recorded {rust_count} Rust, 32 browser, 24 production checks; WASM {stamp["sha256"]}')

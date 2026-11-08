"""Retain this repair's checkpoints without relabeling earlier full-suite runs."""
from pathlib import Path
import hashlib,json,re,datetime
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def save(path,data):(ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def digest(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
comparison=read('references/validation/overlay-controls-comparison.json');rows=comparison['rows']
browser=read('out/overlay-material-followup.json');checks=read('references/validation/overlays-checks.json')
assert browser['stats']['unexpected']==0 and browser['stats']['expected']==16
assert all(c['exitCode']==0 for c in checks['checks'])
rustlog=(ROOT/'out/overlay-followup-rust.log').read_text(encoding='utf8')
assert not re.search(r'test result: FAILED',rustlog)
rust=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rustlog)))
rawpath='out/overlay-controls-native/Raw-HostBackdrop.png';raw=Image.open(ROOT/rawpath)
raw_evidence={'image':rawpath,'sha256':digest(rawpath),'size':list(raw.size),'theme':'Light','tintOpacity':0,'luminosityOpacity':0,'panelWidthDIP':220,'minimumPanelHeightDIP':136.8,'sampleY':260,'samples':[{'x':x,'rgb':list(raw.getpixel((x,260)))[:3]} for x in range(500,730,5)],'boundary':'Same popup-size raw HostBackdrop, active own probe window; screen pixels, not RTB.'}
save('references/overlay-host-backdrop-samples.json',raw_evidence)
save('references/overlay-controls-metrics.json',read('out/overlay-controls-native/controls-native.json'))
save('references/overlay-desktop-acrylic-defaults.json',read('out/overlay-controls-native/desktop-acrylic-defaults.json'))
files=['src/scene/paint.rs','src/scene/overlay_visual.rs','src/scene/overlays.rs','src/render.rs','src/gpu.rs','src/acrylic.glsl','src/material.rs','tests/overlays.rs','gallery/tests/popup-corners.spec.ts','gallery/tests/overlays.spec.ts','gallery/tests/overlay-presentation.spec.ts','tools/native-navigation/OverlayControlsProbe.cs','tools/native-navigation/RawHostBackdropProbe.cs','references/host-backdrop-profile.json','references/overlay-desktop-graph-evidence.json','docs/overlays.md']
report={'generatedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Popup generic rounded material clipping; actual Flyout/MenuFlyout Desktop Acrylic and first-presentable-frame repairs','browser':{'report':'out/overlay-material-followup.json','stats':browser['stats'],'wasm':read('out/overlay-validation/gallery/src/wasm/build-stamp.json')},'rust':{'passed':rust,'log':'out/overlay-followup-rust.log'},'integrationChecks':checks,'nativeScenes':16,'browserScenes':len(rows),'maximumGeometryErrorDIP':max(r['geometryError'] for r in rows),'maximumMenuRowErrorDIP':max(r['rowError'] for r in rows),'maximumOuterEdgeMAE':max(r['outerEdgeMAE'] for r in rows),'material':[{k:r[k] for k in ['backend','name','materialMAE']} for r in rows],'nativeMotionFrames':52,'browserMotionFrames':len(comparison['frames']),'runtimeErrors':comparison['errors'],'rawHostBackdrop':'references/overlay-host-backdrop-samples.json','review':'out/overlay-controls-review/index.html','popupImages':'out/popup-corners/','boundary':['Material MAE measures a blank interior ROI; neither whole-surface nor pixel-perfect parity is asserted.','Browser HostBackdrop is bounded scene sampling with a measured Gaussian approximation; it cannot sample the external desktop.','First-presentable-frame motion is Rust-tested; wall-clock snapshots do not establish native DWM present-time equivalence.','Native probe uses resolved same-SDK binaries, not the Store Gallery distribution.','Other collection controls are edited concurrently; these reports identify their tested binary checkpoint.'],'files':[{'path':p,'sha256':digest(p)} for p in files]}
save('references/validation/overlay-popup-material-followup.json',report)
prior=read('references/validation/overlay-controls-validation.json')
prior['popupMaterialFollowup']={'report':'references/validation/overlay-popup-material-followup.json','browser':report['browser'],'rust':report['rust'],'maximumMenuMaterialMAE':max(r['materialMAE'] for r in rows if '-MenuFlyout-' in r['name'])}
save('references/validation/overlay-controls-validation.json',prior)
stage=read('references/stage-7.json');stage['popupMaterialFollowup']=prior['popupMaterialFollowup'];save('references/stage-7.json',stage)
print(json.dumps({'rust':rust,'browser':browser['stats'],'menuMaterialMAE':prior['popupMaterialFollowup']['maximumMenuMaterialMAE']}))

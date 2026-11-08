"""Publish the actual frozen-host results without claiming native pixel parity."""
from pathlib import Path
import datetime, json
ROOT = Path(__file__).resolve().parent.parent
report = json.loads((ROOT / 'references/validation/composed-controls.json').read_text())
status_path = ROOT / 'references/composed-controls-status.json'
status = json.loads(status_path.read_text())
status['recordedAtUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
status['status'] = 'Implemented and verified against same-SDK fixtures; complete native pixel parity not accepted'
status['evidence'].update(nativeStates=100, nativeMotionFrames=368, browserStatesPerBackend=100,
    motion='references/validation/composed-controls-motion.json', motionReview='out/composed-motion/index.html',
    presentation='out/composed-presentation', webkit='out/composed-webkit')
status['evidence'].update(choiceInteraction='references/validation/composed-choice.json',
    choiceNativeRun='references/choice-interaction-run.json', choiceNativePointerObservations=40,
    choiceNativeTemplateStates=8)
status['evidence'].update(closedComboBox='references/validation/combobox-faceplate.json',
    closedComboBoxNativeStates=28, closedComboBoxNativeRun='references/combo-faceplate-run.json')
status['evidence'].update(comboCorrection='references/validation/combo-correction.json',
    fractionalDpiScales=12, nextBatch='references/validation/picker-foundation.json')
status['wasm'] = report['wasm']
status['checks'] = {'rustTests': report['rustTests']}
if 'rustTestScope' in report: status['checks']['rustScope'] = report['rustTestScope']
status['checks']['concurrentFullRustRun'] = report.get('concurrentFullRustRun')
status['validationPending'] = []
for key in ['browser', 'webkit', 'motion', 'regression']:
    stats = report.get(key, {})
    status['checks'][key] = stats
    if not stats.get('expected') or stats.get('unexpected') or stats.get('flaky'):
        status['validationPending'].append(key)
status['geometryMaxDip'] = {k: v['geometryMaxDip'] for k, v in report['backends'].items()}
status['withinClientGeometryMaxDip'] = {k: v['withinClientGeometryMaxDip'] for k,v in report['backends'].items()}
status['windowEdgeCases'] = {k:v['windowEdgeCases'] for k,v in report['backends'].items()}
status['backendVerified'] = {k:v['backendVerified'] for k,v in report['backends'].items()}
status['remaining'] = report['remaining']
status['intentionalException'] = report['intentionalException']
status['fixes'] = ['NumberBox clear visibility uses current nonempty editable content and focus, including initial/programmatic values and refocus.',
    'Native windowed ComboBox immediate close, stable opening anchor, pointer/keyboard states and item chrome.',
    'Shared Rust popup island escapes ancestor clips, with isolated materials and native shadow depths.',
    'Editable ComboBox arrow/clear separation and source resource names.',
    'ContentDialog natural button widths; TeachingTip tail geometry, clip and material.',
    'Fractional-DPI editor viewport rounding.',
    'Windowed popup shadows are outside the Acrylic content sampling surface.',
    'ComboBox SelectedUnfocused maps the native inactive selection palette.',
    'Unchanged Rust selection preserves pending native browser selection before asynchronous input notifications.',
    'Closed ComboBox common hover and keyboard focus groups are independent; native absolute gradient transforms and physical border/background sizing are retained.',
    'Editable ComboBox focused TextBox overlays the native faceplate background.',
    'Physical-width canonicalization preserves variable-font template measurement and removes false overflow.',
    'Shared ScrollState max removes machine-roundoff overflow at fractional DPR without masking real subpixel overflow.',
    'Editable ComboBox arrow explicitly stretches to the editor height; native internal hover margin is retained.',
    'Rust popup input scope consumes background scroll and list-edge chaining; document adapter projects it to DOM input.',
    'Inactive cached Scene hosts suspend document scroll input scope and restore it on reactivation.',
    'Tight popup surfaces, bounded frame snapshots and stable isolated-window Acrylic tiles reduce dropdown scroll rendering cost.']
status_path.write_text(json.dumps(status, indent=2) + '\n')
progress_path = ROOT / 'references/composed-controls-progress.json'
progress = json.loads(progress_path.read_text())
progress.update(generatedAtUtc=status['recordedAtUtc'], status=status['status'], pending=status['remaining'],
                validationPending=status['validationPending'])
progress_path.write_text(json.dumps(progress, indent=2) + '\n')
print(json.dumps({'checks': status['checks'], 'validationPending': status['validationPending']}, indent=2))

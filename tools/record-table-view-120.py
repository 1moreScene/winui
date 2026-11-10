"""Record CPU budget, native visual differences and presentation limits separately."""
from pathlib import Path
import datetime
import hashlib
import json
import statistics

ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
before_runs=[read(f'out/table-view-120/paired-before-{i}.json') for i in [1,2]]
after_runs=[read(f'out/table-view-120/paired-after-{i}.json') for i in [1,2]]
before,after=before_runs[0],after_runs[0]
assert before['requestedHz']==after['requestedHz']==120
assert before['browser']==after['browser'] and before['args']==after['args']
assert after['wasmSha256']==sha('packages/winui-wasm/src/wasm/winui_bg.wasm')
assert not before['errors'] and not after['errors']
for run in before_runs+after_runs:
    assert run['gpu']['devices']==before['gpu']['devices'] and run['gpu']['featureStatus']==before['gpu']['featureStatus'] and run['browser']==before['browser'] and not run['errors']
assert all(run['wasmSha256']==after['wasmSha256'] for run in after_runs)
native=read('out/table-view-native-performance/performance.json')
native_run=read('references/table-view-native-performance-run.json')
assert native_run['fixtureSha256']==sha('out/table-view-120/fixtures.json')
comparison=read('out/table-view-native-performance/comparison.json')
raster=read('out/table-view-raster-comparison/results.json')
assert raster['candidateWasmSha256']==after['wasmSha256']
assert read('out/table-view-native-performance/rust-geometry.json')['wasmSha256']==after['wasmSha256']
stages=[]
def quantile(values,p):
    values=sorted(values)
    return values[int((len(values)-1)*p)] if values else 0
def summarize(runs,name):
    key=name.split('-')[0];draws=[];frames=[];intervals=[]
    for run in runs:
        stage=next(s for s in run['stages'] if s['name']==name)
        draws.extend(v['ms'] for v in stage['draws'] if v['key']==key)
        frames.extend(v for v in stage['frames'] if v['id']==run['handles'][key])
        intervals.extend(b-a for a,b in zip(stage['raf'],stage['raf'][1:]))
    return {'name':name,'frames':len(frames),'drawP50':quantile(draws,.5),'drawP95':quantile(draws,.95),
        'wasmP95':quantile([f['ms'] for f in frames],.95),'budgetMisses':sum(ms>after['budgetMs'] for ms in draws),
        'rafMedian':quantile(intervals,.5),'rafP95':quantile(intervals,.95),
        'trialSummaries':[next(s for s in run['summary'] if s['name']==name) for run in runs],
        'phases':{k:quantile([(f.get('phases') or {}).get(k,0) for f in frames],.95) for k in ['layoutMs','displayListMs','paintMs','snapshotMs','previousSerializeMs']}}
for current in after['summary']:
    name=current['name'];old=summarize(before_runs,name);current=summarize(after_runs,name)
    key=current['name'].split('-')[0]
    detailed={}
    for version,runs in [('before',before_runs),('after',after_runs)]:
        detailed[version]=[]
        for data in runs:
            stage=next(s for s in data['stages'] if s['name']==name)
            detailed[version].append({'action':stage.get('action'),
                'maximumDrawMs':max((v['ms'] for v in stage['draws'] if v['key']==key),default=0),
                'maximumInputMs':max((v['ms'] for v in stage['inputs'] if v['id']==data['handles'][key]),default=0)})
    stages.append({'name':current['name'],'before':old,'after':current,
        'actionAndWorstFrame':detailed,
        'p95CpuBudgetMet':current['drawP95']<=after['budgetMs']})
native_cadence=[]
for r in native['records']:
    if 'frames' not in r:continue
    intervals=[b['timeMs']-a['timeMs'] for a,b in zip(r['frames'],r['frames'][1:])]
    native_cadence.append({'name':r['name'],'action':r['action'],'frames':len(r['frames']),
        'medianRenderingIntervalMs':statistics.median(intervals),'actionMs':r['actionMs'],
        'scope':'CompositionTarget.Rendering timestamps; not measured CPU draw duration',
        'initialOffset':r['frames'][0]['verticalOffset'],'finalOffset':r['frames'][-1]['verticalOffset']})
sources=['src/render.rs','src/render/retained.rs','src/wasm.rs','src/gpu.rs','src/scene/mod.rs','src/scene/scroll.rs','src/scene/composed.rs','src/scene/table_view.rs','src/scene/table_view/runtime.rs','src/icons.rs','src/material.rs']
evidence=[*[f'out/table-view-120/paired-{version}-{i}.json' for version in ['before','after'] for i in [1,2]],
    'references/table-view-native-performance-run.json','out/table-view-native-performance/performance.json',
    'out/table-view-native-performance/geometry.json','out/table-view-native-performance/rust-geometry.json',
    'out/table-view-native-performance/comparison.json','out/table-view-raster-comparison/results.json']
report={'recordedAt':datetime.datetime.now().astimezone().isoformat(),
    'beforeWasmSha256':before['wasmSha256'],'afterWasmSha256':after['wasmSha256'],
    'requestedHz':120,'cpuBudgetMs':after['budgetMs'],'stages':stages,
    'conditions':{'url':after['url'],'renderer':'Canvas2D','dpr':1.25,'viewport':[1440,1100],
        'browser':after['browser'],'args':after['args'],'gpu':after['gpu'],
        'gpuSamplesPerTrial':[run['gpu'] for run in before_runs+after_runs],
        'driver':after['driver'],'profiler':False,'galleryOrReactProductPatch':False,
        'trialOrder':['before-1','after-1','after-2','before-2'],'aggregation':'Pooled raw frame durations; RAF intervals are computed within each trial, without crossing page clocks'},
    'changes':['Retain isolated row surfaces at native DPR; scrolling/entrance remain composition transforms',
        'Share bounded glyph and pure-vector raster caches across row and opacity layers; LRU instead of clearing every glyph',
        'Only newly realized rows are measured/arranged during vertical scrolling',
        'Unchanged static rows share display-list commands; editors and active visual tracks continue sampling every frame',
        'Avoid opacity-layer backdrop copies when commands do not sample the backdrop',
        'Compare typed display lists and share stable 10,000-row snapshot keys instead of cloning JSON trees',
        'Remove standalone On/Off labels from TableView switches, following original null column defaults'],
    'editorFidelityFix':'Cell editors use constrained horizontal stretch; NumberBox delegates real focus and value selection to its existing InputBox template part, preserving shared text input, clear-button and focus-underline behavior',
    'frozenEditingFixes':['Defer focus reveal until final Canvas world geometry; exclude frozen columns from the non-frozen editor viewport',
        'Use arranged physical-pixel column widths for keyboard reveal; preserve right-edge scroll and actual input focus',
        'Focus delayed template editor content once without stealing later button focus',
        'Pass ComboBox collectionItems and synchronize its initial selected text; paint popup options in the existing floating surface'],
    'animationContract':{'bodyEntranceMs':667,'bodyOffsetDip':28,'indicatorOpacityMs':83,'indicatorScaleMs':167,
        'sampleStepMs':1000/120,'no60HzQuantization':True,'durationOrCurveShortened':False},
    'nativeCadence':native_cadence,'nativeVisualComparison':comparison,'rasterRegression':raster,
    'artifactHashes':{p:sha(p) for p in evidence},'rustSourceHashesAtValidation':{p:sha(p) for p in sources},
    'physical120HzAccepted':False,'allFramesUnderBudget':all(s['after']['budgetMisses']==0 for s in stages),
    'acceptedAsFullNativeParity':False,
    'boundary':'120Hz is the requested BeginFrame sampling cadence and 8.33ms CPU draw budget. Actual RAF distributions and misses are retained; neither CPU budget success nor CLI frame control certifies physical 120Hz presentation. Native SampleApp runs on the available approximately 60Hz presentation clock. Static pixel differences, native anchoring and editor geometry remain explicit; functional passes do not close those gates.'}
(ROOT/'references/validation/table-view-120.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'stages':[{'name':s['name'],'beforeP95':s['before']['drawP95'],'afterP95':s['after']['drawP95'],'misses':s['after']['budgetMisses']} for s in stages], 'physical120HzAccepted':False,'acceptedAsFullNativeParity':False},indent=2))

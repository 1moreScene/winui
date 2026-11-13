import { useEffect, useRef, useState } from 'react';
import { Border } from 'winui-wasm/react';
import { Artboard } from './Artboard';
import { Inspector } from './Inspector';
import { Surface, UiButton, UiToggleButton, UiSegmented, UiNotice, UiSearch, UiSelect, UiText } from './Controls';
import { ControlLibrary } from './ControlLibrary';
import { Icon } from './Icon';
import { ExportDialog } from './ExportDialog';
import { useDocumentHistory } from './history';
import { catalog, clamp, createNode, loadDocument, metadata, parseDocument, STORAGE_KEY, type ControlKind, type DesignNode } from './model';

export function App() {
  const [initial] = useState(loadDocument);
  const { document, commit, undo, redo, canUndo, canRedo } = useDocumentHistory(initial.document);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState(''), [zoom, setZoom] = useState(.75);
  const [snapping, setSnapping] = useState(true), [preview, setPreview] = useState(false);
  const [tab, setTab] = useState<'components' | 'layers'>('components');
  const [saveStatus, setSaveStatus] = useState('已保存到本地'), [notice, setNotice] = useState(initial.error ?? '');
  const [exportOpen, setExportOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null), workspace = useRef<HTMLDivElement>(null);
  const selected = document.nodes.find(node => node.id === selectedId);

  useEffect(() => {
    if (initial.error && document === initial.document) { setSaveStatus('草稿读取失败'); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(document)); setSaveStatus('已保存到本地'); }
    catch { setSaveStatus('本地保存失败，请导出备份'); }
  }, [document, initial]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);

  function changeNode(node: DesignNode) { commit({ ...document, nodes: document.nodes.map(n => n.id === node.id ? node : n) }); }
  function add(kind: ControlKind, x?: number, y?: number) {
    if (!catalog.some(item => item.kind === kind) || preview) return;
    if (document.nodes.length >= 500) { setNotice('每个页面最多支持 500 个控件'); return; }
    const offset = document.nodes.length % 8 * 24, node = createNode(kind, 48 + offset, 48 + offset);
    node.x = clamp(x ?? node.x, 0, Math.max(0, document.width - node.width));
    node.y = clamp(y ?? node.y, 0, Math.max(0, document.height - node.height));
    commit({ ...document, nodes: [...document.nodes, node] }); setSelectedId(node.id);
  }
  function remove() { if (selected) { commit({ ...document, nodes: document.nodes.filter(node => node.id !== selected.id) }); setSelectedId(null); } }
  function duplicate() {
    if (!selected || document.nodes.length >= 500) return;
    const node = { ...selected, id: `node-${crypto.randomUUID()}`, name: `${selected.name.slice(0, 95)} Copy`, locked: false,
      x: clamp(selected.x + 24, 0, Math.max(0, document.width - selected.width)), y: clamp(selected.y + 24, 0, Math.max(0, document.height - selected.height)) };
    commit({ ...document, nodes: [...document.nodes, node] }); setSelectedId(node.id);
  }
  function reorder(direction: number) {
    if (!selected) return;
    const nodes = [...document.nodes], index = nodes.findIndex(n => n.id === selected.id), next = clamp(index + direction, 0, nodes.length - 1);
    [nodes[index], nodes[next]] = [nodes[next], nodes[index]]; commit({ ...document, nodes });
  }
  function fit() {
    const area = workspace.current, stage = area?.querySelector('.canvas-stage');
    if (!area || !stage) return;
    const style = getComputedStyle(stage), horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight), vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    setZoom(clamp(Math.floor(Math.min((area.clientWidth - horizontal) / document.width, (area.clientHeight - vertical) / document.height) * 100) / 100, .1, 2));
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (exportOpen || event.target instanceof Element && event.target.closest('input,textarea,[contenteditable=true]')) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); setNotice(saveStatus); return; }
      if (preview) { if (event.key === 'Escape' && !event.defaultPrevented) setPreview(false); return; }
      if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      else if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); if (!selected?.locked) remove(); }
      else if (event.key === 'Escape') setSelectedId(null);
      else if (selected && !selected.locked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        if (event.target instanceof Element && event.target.closest('[data-designer-ui="Segmented"],[role="tree"]')) return;
        event.preventDefault(); const distance = event.shiftKey ? 10 : 1;
        changeNode({ ...selected, x: clamp(selected.x + (event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0), 0, Math.max(0, document.width - selected.width)), y: clamp(selected.y + (event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0), 0, Math.max(0, document.height - selected.height)) });
      }
    }
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  });
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('文件不能超过 2 MB');
      const imported = parseDocument(await file.text()); commit(imported); setSelectedId(null); setNotice(`已导入「${imported.name}」`);
    } catch (error) { setNotice(`导入失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  const zooms = [...new Set([.25, .5, .75, 1, 1.25, 1.5, 2, zoom])].sort((a, b) => a - b);
  return <div className="designer-app">
    <header className="app-header" inert={exportOpen}>
      <div className="brand"><Surface kind="SymbolIcon" width={32}><Icon name="grid" /></Surface><UiText text="WinUI Designer" width={150} /><UiText text="Beta" width={48} /></div>
      <span className="header-divider" /><div className="project-title"><UiText text={document.name || '未命名页面'} width="100%" /><UiText text="本地项目" width={80} /></div>
      <div className="header-actions"><div className="history-actions"><UiButton icon="undo" label="撤销 Ctrl+Z" disabled={!canUndo || preview} onClick={undo} /><UiButton icon="redo" label="重做 Ctrl+Shift+Z" disabled={!canRedo || preview} onClick={redo} /></div>
        <UiButton text="导入" icon="upload" label="导入 JSON" disabled={preview} onClick={() => fileInput.current?.click()} />
        <UiButton text={preview ? '返回设计' : '预览'} icon="play" label={preview ? '返回设计' : '预览页面'} onClick={() => setPreview(!preview)} />
        <UiButton text="导出" icon="code" label="导出设计" primary onClick={() => setExportOpen(true)} />
      </div>
    </header>
    {/* The browser file chooser is a host capability, activated by the SDK Button. */}
    <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="导入设计文件" onChange={event => { void importFile(event.target.files?.[0]); }} />
    <div className="editor-body" inert={exportOpen}>
      <aside className="toolbox" aria-label="组件工具栏">
        <div className="panel-tabs"><UiSegmented label="工具面板" value={tab} items={[{ id: 'components', text: '组件', icon: '\uE8A7' }, { id: 'layers', text: `图层 ${document.nodes.length}`, icon: '\uE7C4' }]} onChange={value => { if (value === 'components' || value === 'layers') setTab(value); }} /></div>
        {tab === 'components' ? <>
          <div className="component-search"><UiSearch value={query} onChange={setQuery} /></div>
          <ControlLibrary query={query} disabled={preview} onAdd={add} />
          <div className="toolbox-help"><UiText text="点击添加，或拖放组件到画布" width="100%" /></div>
        </> : <>
          <div className="layers-page"><UiButton text={document.name || '未命名页面'} icon="file" width="100%" onClick={() => setSelectedId(null)} /></div>
          <div className="layers-list">{[...document.nodes].reverse().map(node => <div className={`layer-row ${selectedId === node.id ? 'active' : ''}`} key={node.id}>
            <UiButton text={node.name} label={`选择图层 ${node.name}`} icon={metadata(node.kind).icon} primary={selectedId === node.id} width="100%" onClick={() => setSelectedId(node.id)} />
            <UiButton icon={node.locked ? 'lock' : 'unlock'} label={`${node.locked ? '解锁' : '锁定'} ${node.name}`} disabled={preview} onClick={() => changeNode({ ...node, locked: !node.locked })} />
            <UiButton icon={node.hidden ? 'hidden' : 'eye'} label={`${node.hidden ? '显示' : '隐藏'} ${node.name}`} disabled={preview} onClick={() => changeNode({ ...node, hidden: !node.hidden })} />
          </div>)}</div><div className="layers-hint"><UiText text="上方图层显示在前景。" width="100%" /></div>
        </>}
        <div className="toolbox-bottom"><UiButton text="新建页面" icon="plus" label="新建空白页面" disabled={preview} width="100%" onClick={() => { commit({ ...document, name: '未命名页面', nodes: [] }); setSelectedId(null); setNotice('已新建空白页面，可通过撤销恢复'); }} /></div>
      </aside>
      <main className="canvas-column" aria-label="页面设计画布">
        <div className="canvas-toolbar"><div className="breadcrumb"><UiText text={`页面 / ${document.name || '未命名页面'}`} width="100%" /></div><div className="canvas-tools"><UiToggleButton text="吸附" icon="grid" label="8 像素网格吸附" checked={snapping} disabled={preview} onChange={setSnapping} /><UiText text={preview ? '预览模式' : '设计模式'} className="canvas-mode" /></div></div>
        <div className={`workspace ${preview ? 'is-preview' : ''}`} ref={workspace}>
          <Surface kind="Border" style={{ position: 'absolute', inset: 0, height: '100%', pointerEvents: 'none' }}><Border background={{ resource: 'SolidBackgroundFillColorBaseBrush' }} /></Surface>
          <div className="canvas-stage"><Artboard document={document} selectedId={selectedId} zoom={zoom} preview={preview} snapping={snapping} onSelect={setSelectedId} onChange={changeNode} onAdd={add} /></div>
          <div className="canvas-floating-tools"><UiButton icon="minus" label="缩小画布" disabled={zoom <= .1} onClick={() => setZoom(clamp(Math.round((zoom - .1) * 100) / 100, .1, 2))} /><UiSelect label="画布缩放" width={90} value={String(zoom)} items={zooms.map(value => ({ id: String(value), text: `${Math.round(value * 100)}%` }))} onChange={value => setZoom(Number(value))} /><UiButton icon="plus" label="放大画布" disabled={zoom >= 2} onClick={() => setZoom(clamp(Math.round((zoom + .1) * 100) / 100, .1, 2))} /><span /><UiButton icon="fit" label="适应画布" onClick={fit} /></div>
        </div>
        <footer className="canvas-status"><UiText text={saveStatus} /><UiText text={preview ? 'Esc 返回设计' : '方向键微调 · Shift 加速 · Delete 删除'} className="keyboard-hint" /><UiText text={`${document.nodes.length} 个组件`} /></footer>
      </main>
      <Inspector key={selected?.id ?? 'page'} document={document} selected={selected} preview={preview} onDocument={commit} onNode={changeNode} onDelete={remove} onDuplicate={duplicate} onReorder={reorder} />
    </div>
    {notice && <UiNotice message={notice} onClose={() => setNotice('')} />}
    {exportOpen && <ExportDialog document={document} onClose={() => setExportOpen(false)} onNotice={setNotice} />}
  </div>;
}

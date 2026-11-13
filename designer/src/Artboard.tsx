import { useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { RendererBackend, ThemeMode, type Scene, type ThumbDragDeltaEvent } from 'winui-wasm';
import { SceneView, Canvas, TextBlock, Border, Thumb } from 'winui-wasm/react';
import { DesignedControl } from './DesignedControl';
import { UiText } from './Controls';
import { clamp, snap, type DesignDocument, type DesignNode, type ControlKind } from './model';

interface Props {
  document: DesignDocument; selectedId: string | null; zoom: number; preview: boolean; snapping: boolean;
  onSelect: (id: string | null) => void; onChange: (node: DesignNode) => void; onAdd: (kind: ControlKind, x: number, y: number) => void;
}
interface Gesture { node: DesignNode; dx: number; dy: number; resizing: boolean }

export function Artboard({ document, selectedId, zoom, preview, snapping, onSelect, onChange, onAdd }: Props) {
  const surface = useRef<HTMLDivElement>(null), gesture = useRef<Gesture | null>(null), draftRef = useRef<DesignNode | null>(null);
  const liveScene = useRef<Scene | null>(null);
  useLayoutEffect(() => { if (surface.current && liveScene.current) Object.assign(surface.current, { designerScene: liveScene.current }); });
  const [draft, setDraft] = useState<DesignNode | null>(null), [dropping, setDropping] = useState(false);
  const nodes = document.nodes.map(n => draft?.id === n.id ? draft : n), selected = nodes.find(n => n.id === selectedId);
  function begin(node: DesignNode, resizing = false) {
    onSelect(node.id);
    if (node.locked) return;
    gesture.current = { node, dx: 0, dy: 0, resizing }; draftRef.current = null;
  }
  function move(event: ThumbDragDeltaEvent) {
    const g = gesture.current; if (!g) return;
    // Thumb deltas are Rust scene coordinates, including host zoom/DPI transforms.
    g.dx += event.horizontalChange; g.dy += event.verticalChange;
    const node = g.resizing
      ? { ...g.node, width: clamp(snap(g.node.width + g.dx, snapping), 8, Math.max(8, document.width - g.node.x)), height: clamp(snap(g.node.height + g.dy, snapping), 4, Math.max(4, document.height - g.node.y)) }
      : { ...g.node, x: clamp(snap(g.node.x + g.dx, snapping), 0, Math.max(0, document.width - g.node.width)), y: clamp(snap(g.node.y + g.dy, snapping), 0, Math.max(0, document.height - g.node.height)) };
    draftRef.current = node; setDraft(node);
  }
  function finish(canceled: boolean) {
    if (!canceled && draftRef.current) onChange(draftRef.current);
    gesture.current = null; draftRef.current = null; setDraft(null);
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDropping(false);
    const kind = event.dataTransfer.getData('application/winui-control') as ControlKind, rect = surface.current!.getBoundingClientRect();
    onAdd(kind, snap((event.clientX - rect.left) / zoom, snapping), snap((event.clientY - rect.top) / zoom, snapping));
  }
  return <div className="artboard-wrap" style={{ width: document.width * zoom, height: document.height * zoom }}>
    <div className="artboard-caption"><UiText text={document.name || '未命名页面'} /><UiText text={`${document.width} × ${document.height}`} /></div>
    <div ref={surface} className={`artboard ${dropping ? 'is-dropping' : ''}`} data-testid="artboard" style={{ width: document.width, height: document.height, transform: `scale(${zoom})`, background: document.background }}
      onDragOver={event => { if (!preview && event.dataTransfer.types.includes('application/winui-control')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropping(true); } }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropping(false); }} onDrop={event => { if (!preview) drop(event); }}>
      <div className="sdk-surface" inert={!preview} style={{ pointerEvents: preview ? 'auto' : 'none' }}>
        <SceneView key={preview ? 'preview' : 'design'} theme={document.theme} backend={RendererBackend.Canvas2D} style={{ width: document.width, height: document.height }} onReady={scene => { liveScene.current = scene; if (surface.current) Object.assign(surface.current, { designerScene: scene }); }}>
          <Canvas width={document.width} height={document.height} background={document.background} clip>
            {nodes.map((node, layer) => <DesignedControl key={node.id} node={node} layer={layer} />)}
          </Canvas>
        </SceneView>
      </div>
      {!preview && <div className="design-overlay" data-testid="design-overlay" data-designer-ui="Thumb">
        <SceneView theme={ThemeMode.Light} backend={RendererBackend.Canvas2D} style={{ width: document.width, height: document.height }}>
          <Canvas width={document.width} height={document.height}>
            <Thumb accessibleName="取消选择" width={document.width} height={document.height} zIndex={-1} onDragStarted={() => onSelect(null)} />
            {nodes.filter(n => !n.hidden).map((node, layer) => <Thumb key={node.id} accessibleName={`选择 ${node.name}`} canvasLeft={node.x} canvasTop={node.y} width={node.width} height={node.height} zIndex={layer}
              onDragStarted={() => begin(node)} onDragDelta={move} onDragCompleted={event => finish(event.canceled)} />)}
            {selected && !selected.hidden && <>
              <Border canvasLeft={selected.x} canvasTop={selected.y} width={selected.width} height={selected.height} borderBrush={{ resource: 'AccentFillColorDefaultBrush' }} borderThickness={[1, 1, 1, 1]} zIndex={1000} isHitTestVisible={false} />
              <Border canvasLeft={selected.x} canvasTop={Math.max(0, selected.y - 24)} height={24} background={{ resource: 'AccentFillColorDefaultBrush' }} zIndex={1000} isHitTestVisible={false}><TextBlock text={`${selected.name}${selected.locked ? ' · 已锁定' : ''}`} foreground={{ resource: 'TextOnAccentFillColorPrimaryBrush' }} /></Border>
              {!selected.locked && <Thumb accessibleName="调整所选控件尺寸" canvasLeft={selected.x + selected.width - 5} canvasTop={selected.y + selected.height - 5} width={10} height={10} background={{ resource: 'SolidBackgroundFillColorBaseBrush' }} borderBrush={{ resource: 'AccentFillColorDefaultBrush' }} borderThickness={[1, 1, 1, 1]} zIndex={1001}
                onDragStarted={() => begin(selected, true)} onDragDelta={move} onDragCompleted={event => finish(event.canceled)} />}
            </>}
            {!nodes.some(n => !n.hidden) && <TextBlock text="从一个组件开始 · 点击左侧组件，或拖放到这里" canvasLeft={48} canvasTop={document.height / 2 - 20} width={document.width - 96} height={40} isHitTestVisible={false} />}
          </Canvas>
        </SceneView>
      </div>}
    </div>
  </div>;
}

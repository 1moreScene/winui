import { useMemo, useRef, useState } from 'react';
import { SceneView, TreeView } from 'winui-wasm/react';
import { HorizontalAlignment, VerticalAlignment, RendererBackend, ThemeMode, TreeViewSelectionMode, type TreeItem } from 'winui-wasm';
import { catalog, groups, type ControlKind } from './catalog';

export function ControlLibrary({ query, disabled, onAdd }: { query: string; disabled: boolean; onAdd: (kind: ControlKind) => void }) {
  const [expanded, setExpanded] = useState<string[]>(['group:Basic input']);
  const [selection, setSelection] = useState<readonly string[]>([]);
  const dragKind = useRef<ControlKind | null>(null);
  const items = useMemo<TreeItem[]>(() => Object.entries(groups).flatMap(([group, kinds]) => {
    const visible = kinds.filter(kind => kind.toLowerCase().includes(query.trim().toLowerCase()));
    return visible.length ? [{ id: `group:${group}`, text: group, icon: '\uE8A7', isExpanded: !!query.trim() || expanded.includes(`group:${group}`), children: visible.map(kind => ({ id: `control:${kind}`, text: kind, icon: '\uE8A5' })) }] : [];
  }), [query, expanded]);
  const expandedKeys = query.trim() ? items.map(item => item.id) : expanded;
  // Filtering changes the toolbox's business data. Do not retain a selection
  // whose row is removed or folded out of the native collection.
  const selectableKeys = new Set(items.flatMap(item => [item.id, ...(item.isExpanded ? item.children?.map(child => child.id) ?? [] : [])]));
  const selectedKeys = selection.filter(key => selectableKeys.has(key));
  function kindFromId(id?: string): ControlKind | null {
    return catalog.find(item => `control:${item.kind}` === id)?.kind ?? null;
  }
  return <div className="component-library" data-designer-ui="TreeView" draggable={!disabled}
    onPointerDownCapture={event => {
      const row = (event.target as Element).closest('[role="treeitem"]');
      const label = row?.getAttribute('aria-label');
      dragKind.current = catalog.find(item => item.kind === label)?.kind ?? null;
    }}
    onDragStart={event => {
      if (disabled || !dragKind.current) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/winui-control', dragKind.current); event.dataTransfer.effectAllowed = 'copy';
    }}>
    <SceneView theme={ThemeMode.Light} backend={RendererBackend.Canvas2D} style={{ width: '100%', height: '100%' }}>
      <TreeView accessibleName="WinUI controls" horizontalAlignment={HorizontalAlignment.Stretch} verticalAlignment={VerticalAlignment.Stretch} items={items} expandedKeys={expandedKeys} selectedKeys={selectedKeys} enabled={!disabled} selectionMode={TreeViewSelectionMode.Single} canDragItems={false} canReorderItems={false} allowDrop={false}
        onSelectionChanged={event => { setSelection(event.selectedKeys); const kind = kindFromId(event.item?.id); if (kind) dragKind.current = kind; }}
        onItemInvoked={event => { const kind = kindFromId(event.item?.id); if (kind && !disabled) onAdd(kind); }}
        onExpanding={event => { const key = event.item?.id ?? event.navigation.key; if (key) setExpanded(current => [...new Set([...current, key])]); }}
        onCollapsed={event => { const key = event.item?.id ?? event.navigation.key; if (key) setExpanded(current => current.filter(value => value !== key)); }} />
    </SceneView>
  </div>;
}

/** Platform projection of a Rust-owned scroll input root. No Gallery policy. */
export interface ScrollInputScope {
  root(): number;
  contains(target: EventTarget | null): boolean;
  wheel(event: WheelEvent): void;
  dismiss(root: number): void;
}
type Entry = { scope: ScrollInputScope; root: number; order: number };
const documents = new WeakMap<Document, { entries: Set<Entry>; abort: AbortController; serial: number }>();
export function registerScrollInputScope(doc: Document, scope: ScrollInputScope) {
  let manager = documents.get(doc);
  if (!manager) {
    manager = { entries: new Set(), abort: new AbortController(), serial: 0 };
    documents.set(doc, manager);
    const state = manager, signal = state.abort.signal;
    const refresh = (entry: Entry) => {
      const root = entry.scope.root();
      if (root !== entry.root) { entry.root = root; if (root) entry.order = ++state.serial; }
    };
    const active = () => {
      let result: Entry | undefined;
      for (const entry of state.entries) { refresh(entry); if (entry.root && (!result || entry.order > result.order)) result = entry; }
      return result;
    };
    doc.addEventListener('wheel', event => {
      const entry = active(); if (!entry) return;
      event.preventDefault(); event.stopImmediatePropagation(); entry.scope.wheel(event);
    }, { capture: true, passive: false, signal });
    doc.addEventListener('touchmove', event => {
      const entry = active(); if (!entry) return;
      event.preventDefault(); if (!entry.scope.contains(event.target)) event.stopImmediatePropagation();
    }, { capture: true, passive: false, signal });
    doc.addEventListener('keydown', event => {
      const entry = active();
      if (entry && !entry.scope.contains(event.target) && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, { capture: true, signal });
    doc.addEventListener('pointerdown', event => {
      const entry = active();
      if (entry && !entry.scope.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); entry.scope.dismiss(entry.root); }
    }, { capture: true, signal });
  }
  const entry: Entry = { scope, root: 0, order: 0 }; manager.entries.add(entry);
  return () => { manager!.entries.delete(entry); if (!manager!.entries.size) { manager!.abort.abort(); documents.delete(doc); } };
}

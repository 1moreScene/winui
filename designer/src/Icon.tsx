import { FontIcon, SymbolIcon } from 'winui-wasm/react';
import { Symbol } from 'winui-wasm';

// Public WinUI symbols and Segoe Fluent Icons code points. The SDK resolves
// these through its bundled icon font; the designer supplies no custom paths.
const symbols: Record<string, Symbol> = {
  pointer: Symbol.TouchPointer, text: Symbol.Font, button: Symbol.Stop,
  input: Symbol.Edit, check: Symbol.Accept, toggle: Symbol.Switch,
  slider: Symbol.Setting, progress: Symbol.Sync, border: Symbol.SetTile,
  square: Symbol.Stop, search: Symbol.Find, layers: Symbol.TwoPage,
  undo: Symbol.Undo, redo: Symbol.Redo, play: Symbol.Play,
  upload: Symbol.Upload, download: Symbol.Download, plus: Symbol.Add,
  minus: Symbol.Remove, eye: Symbol.View, hidden: Symbol.HideBcc,
  lock: Symbol.Permissions, unlock: Symbol.Edit, duplicate: Symbol.Copy, trash: Symbol.Delete,
  up: Symbol.Up, grid: Symbol.AllApps, fit: Symbol.FullScreen,
  close: Symbol.Cancel, file: Symbol.Document, arrow: Symbol.Forward,
  spark: Symbol.Highlight,
};
const glyphs: Record<string, string> = {
  code: '\uE943', chevron: '\uE70D', down: '\uF0AE', monitor: '\uE770',
};
export function Icon({ name }: { name: string }) {
  return glyphs[name] ? <FontIcon glyph={glyphs[name]} /> : <SymbolIcon symbol={symbols[name] ?? Symbol.Help} />;
}

import {parseSync} from '../packages/winui-wasm/node_modules/rolldown/dist/utils-index.mjs';

// Public asset URLs in SDK options and JSON data are ordinary JS strings, so
// Vite's import/CSS URL handling cannot rebase them automatically.
export function galleryAssetBase() {
  let prefix = '';
  return {
    name: 'gallery-public-asset-base', apply: 'build', enforce: 'post',
    configResolved(config) { prefix = config.base === '/' ? '' : config.base.replace(/\/$/, ''); },
    transform(code, id) {
      if (!prefix || !id.replaceAll('\\', '/').includes('/gallery/src/') || id.includes('?raw') || /\.(?:css|html)(?:\?|$)/.test(id)) return;
      const isAsset = value => typeof value === 'string' && /^\/(?:official|project|community-table-view|community-segmented|licenses)\//.test(value);
      if (!/\/(?:official|project|community-table-view|community-segmented|licenses)\//.test(code)) return;
      const parsed = parseSync('gallery-module.js', code);
      if (parsed.errors.length) throw new Error(`Cannot rebase Gallery assets in ${id}: ${JSON.stringify(parsed.errors)}`);
      const edits = [];
      function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'Literal' && isAsset(node.value)) edits.push({start: node.start, end: node.end, text: JSON.stringify(prefix + node.value)});
        if (node.type === 'TemplateElement' && isAsset(node.value.raw)) edits.push({start: node.start, end: node.start, text: prefix});
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      }
      visit(parsed.program);
      if (!edits.length) return;
      for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
      return {code, map: null};
    },
  };
}

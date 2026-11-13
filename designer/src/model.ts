import { ButtonVariant, ThemeMode } from 'winui-wasm';

import { catalog, metadata, defaultProperties, controlFields, textKinds, enumChoices, type ControlKind, type PropertyValue } from './catalog';
import { documentSource } from './control-spec';
export { catalog, metadata, controlFields, textKinds, checkedKinds, valueKinds } from './catalog';
export type { ControlKind, PropertyValue } from './catalog';

export interface DesignNode {
  id: string;
  kind: ControlKind;
  name: string;
  x: number; y: number; width: number; height: number;
  text: string; fontSize: number; fontWeight: number;
  foreground: string; background: string; radius: number;
  placeholder: string; variant: ButtonVariant; checked: boolean; value: number;
  enabled: boolean; hidden: boolean; locked: boolean;
  properties: Record<string, PropertyValue>;
}
export interface DesignDocument {
  version: 1; name: string; width: number; height: number;
  background: string; theme: ThemeMode; nodes: DesignNode[];
}
export const STORAGE_KEY = 'winui-designer.document.v1';
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const snap = (value: number, enabled: boolean) => Math.round(value / (enabled ? 8 : 1)) * (enabled ? 8 : 1);

export function createNode(kind: ControlKind, x = 48, y = 48): DesignNode {
  const item = metadata(kind);
  return {
    id: `node-${crypto.randomUUID()}`, kind, name: item.title, x, y, width: item.width, height: item.height,
    text: textKinds.has(kind) ? kind : '',
    fontSize: 14, fontWeight: 400, foreground: '', background: '',
    radius: 4, placeholder: '请输入内容', variant: ButtonVariant.Standard,
    checked: false, value: kind === 'RatingControl' ? 3 : kind === 'InfoBadge' ? 9 : 50, enabled: true, hidden: false, locked: false,
    properties: defaultProperties(kind),
  };
}

export function starterDocument(): DesignDocument {
  const node = (kind: ControlKind, properties: Partial<DesignNode>) => ({ ...createNode(kind), ...properties });
  return {
    version: 1, name: '工作空间设置', width: 800, height: 640, background: '#f7f8fa', theme: ThemeMode.Light,
    nodes: [
      node('TextBlock', { name: '页面标题', x: 48, y: 36, width: 600, height: 44, text: '让工作，从这里开始', fontSize: 28, fontWeight: 600 }),
      node('TextBlock', { name: '页面说明', x: 48, y: 88, width: 680, height: 28, text: '一个属于你和团队的空间。按你的方式，设置每一处细节。', foreground: '#737986' }),
      node('Border', { name: '设置卡片', background: '#ffffff', radius: 12, x: 48, y: 144, width: 704, height: 360 }),
      node('TextBlock', { name: '卡片标题', x: 80, y: 172, width: 600, height: 32, text: '基本信息', fontSize: 18, fontWeight: 600 }),
      node('TextBlock', { name: '名称标签', x: 80, y: 224, width: 400, height: 24, text: '工作空间名称' }),
      node('TextBox', { name: '工作空间名称', x: 80, y: 256, width: 640, text: 'Design Studio' }),
      node('TextBlock', { name: '通知标题', x: 80, y: 320, width: 400, height: 28, text: '保持同步', fontSize: 16, fontWeight: 600 }),
      node('TextBlock', { name: '通知说明', x: 80, y: 356, width: 440, height: 28, text: '接收团队动态与项目更新', foreground: '#737986' }),
      node('ToggleSwitch', { name: '更新通知', x: 600, y: 344, width: 112, checked: true }),
      node('CheckBox', { name: '自动保存', x: 80, y: 424, width: 500, text: '自动保存工作空间中的更改', checked: true }),
      node('Button', { name: '保存按钮', x: 48, y: 536, width: 136, height: 40, text: '保存更改', variant: ButtonVariant.Accent }),
      node('Button', { name: '取消按钮', x: 200, y: 536, width: 88, height: 40, text: '取消', variant: ButtonVariant.Subtle }),
    ],
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('文档格式不正确');
  return value as Record<string, unknown>;
}
function number(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}应为 ${min}–${max} 之间的数字`);
  return value;
}
function string(value: unknown, label: string, max = 2000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}格式不正确`);
  return value;
}
function color(value: unknown, optional = false): string {
  if (typeof value !== 'string' || !(optional && value === '') && !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)) throw new Error('颜色需要使用 #RRGGBB 或 #RRGGBBAA 格式');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('控件状态应为布尔值');
  return value;
}
export function parseProperties(kind: ControlKind, input: unknown): Record<string, PropertyValue> {
  if (input === undefined) return defaultProperties(kind);
  const source = record(input), fields = controlFields(kind), result = defaultProperties(kind);
  function plain(value: unknown, depth = 0): PropertyValue {
    if (depth > 10) throw new Error('Property data is nested too deeply');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return number(value, 'Property', -1000000, 1000000);
    if (typeof value === 'string') return string(value, 'Property', 50000);
    if (Array.isArray(value)) { if (value.length > 200) throw new Error('At most 200 data items are supported'); return value.map(v => plain(v, depth + 1)); }
    const object = record(value), output: Record<string, PropertyValue> = {};
    for (const [key, child] of Object.entries(object)) {
      if (key.startsWith('$') || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid property key');
      output[key] = plain(child, depth + 1);
    }
    return output;
  }
  for (const [key, value] of Object.entries(source)) {
    const field = fields.find(field => field.key === key);
    if (!field) throw new Error(`${kind} does not support property ${key}`);
    if (field.type === 'boolean') result[key] = boolean(value);
    else if (field.type === 'number') result[key] = number(value, key, field.min ?? 0, field.max ?? 3000);
    else if (field.type === 'enum') {
      if (typeof value !== 'string' || !enumChoices(field.enumName!).includes(value)) throw new Error(`Invalid ${key}`);
      result[key] = value;
    } else if (field.type === 'color') result[key] = color(value);
    else if (field.type === 'text') result[key] = string(value, key);
    else {
      if (Array.isArray(field.value) && !Array.isArray(value)) throw new Error(`${key} must be an array`);
      result[key] = plain(value);
    }
  }
  return result;
}

/** Validate before touching the current document. Never evaluate imported content. */
export function parseDocument(text: string): DesignDocument {
  if (text.length > 2_000_000) throw new Error('文件不能超过 2 MB');
  const data = record(JSON.parse(text));
  if (data.version !== 1) throw new Error('不支持的文档版本');
  if (!Object.values(ThemeMode).includes(data.theme as ThemeMode)) throw new Error('不支持的主题');
  if (!Array.isArray(data.nodes) || data.nodes.length > 500) throw new Error('文档最多支持 500 个控件');
  const ids = new Set<string>();
  const nodes = data.nodes.map(value => {
    const n = record(value);
    if (!catalog.some(item => item.kind === n.kind)) throw new Error(`不支持的控件：${String(n.kind)}`);
    const id = string(n.id, '控件 ID', 100);
    if (!id || ids.has(id)) throw new Error('控件 ID 不能为空或重复');
    ids.add(id);
    if (!Object.values(ButtonVariant).includes(n.variant as ButtonVariant)) throw new Error('不支持的按钮样式');
    return {
      id, kind: n.kind as ControlKind, name: string(n.name, '控件名称', 100),
      x: number(n.x, 'X', 0, 3000), y: number(n.y, 'Y', 0, 3000),
      width: number(n.width, '宽度', 8, 3000), height: number(n.height, '高度', 4, 3000),
      text: string(n.text, '文本'), placeholder: string(n.placeholder, '占位文本'),
      fontSize: number(n.fontSize, '字号', 8, 120), fontWeight: number(n.fontWeight, '字重', 100, 900),
      foreground: color(n.foreground, true), background: color(n.background, true), radius: number(n.radius, '圆角', 0, 500),
      variant: n.variant as ButtonVariant, checked: boolean(n.checked), value: number(n.value, '数值', -1000000, 1000000),
      enabled: boolean(n.enabled), hidden: boolean(n.hidden), locked: boolean(n.locked),
      properties: parseProperties(n.kind as ControlKind, n.properties),
    };
  });
  return {
    version: 1, name: string(data.name, '页面名称', 100), width: number(data.width, '页面宽度', 320, 3000),
    height: number(data.height, '页面高度', 320, 3000), background: color(data.background), theme: data.theme as ThemeMode, nodes,
  };
}

export function loadDocument(): { document: DesignDocument; error?: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return { document: saved ? parseDocument(saved) : starterDocument() };
  } catch { return { document: starterDocument(), error: '本地草稿无法读取，已打开示例页面；原草稿暂未覆盖。' }; }
}

/** Export the same SDK declaration tree used by the live canvas. */
export const reactSource = documentSource;

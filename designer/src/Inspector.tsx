import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ButtonVariant, ThemeMode } from 'winui-wasm';
import { UiButton, UiSegmented, UiCheck, UiColor, UiInput, UiNumber, UiSelect, UiText } from './Controls';
import { textKinds, checkedKinds, valueKinds, controlFields, parseProperties, type DesignDocument, type DesignNode, type PropertyValue } from './model';
import { enumChoices, type PropertyField } from './catalog';

function Field({ label, value, onChange, disabled = false, maxLength = 2000, validate, multiline = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; maxLength?: number; validate?: (value: string) => boolean; multiline?: boolean }) {
  const [draft, setDraft] = useState(value), latest = useRef(draft); latest.current = draft;
  useEffect(() => { setDraft(value); latest.current = value; }, [value]);
  return <div className="field"><UiText text={label} height={24} />
    <UiInput label={label} value={draft} disabled={disabled} maxLength={maxLength} multiline={multiline} onChange={text => { latest.current = text; setDraft(text); }} onCommit={() => { if (validate && !validate(latest.current)) { latest.current = value; setDraft(value); } else if (latest.current !== value) onChange(latest.current); }} />
  </div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="inspector-section"><div className="section-heading"><UiText text={title} /></div>{children}</section>;
}
function ColorField({ label, value, onChange, disabled, optional = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; optional?: boolean }) {
  return <div className="field"><UiText text={label} height={24} /><div className="color-field-row">
    <UiColor label={label} value={value} onChange={onChange} disabled={disabled} />
    <div className="color-text"><Field label={`${label}色值`} value={value} disabled={disabled} validate={color => /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color) || optional && !color} onChange={onChange} /></div>
    {optional && <UiButton icon="close" label={`重置${label}`} disabled={disabled || !value} onClick={() => onChange('')} />}
  </div></div>;
}

function NativeProperty({ node, field, onNode }: { node: DesignNode; field: PropertyField; onNode: (node: DesignNode) => void }) {
  const [error, setError] = useState('');
  const value = node.properties[field.key] ?? field.value;
  function parsed(next: PropertyValue) { return parseProperties(node.kind, { ...node.properties, [field.key]: next }); }
  function commit(next: PropertyValue) {
    try { onNode({ ...node, properties: parsed(next) }); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  }
  return <div className="field">
    {field.type === 'boolean' ? <UiCheck label={field.key} checked={Boolean(value)} disabled={node.locked} onChange={commit} /> : <>
      {field.type === 'enum' ? <><UiText text={field.key} /><UiSelect label={field.key} value={String(value)} disabled={node.locked} items={enumChoices(field.enumName!).map(value => ({ id: value, text: value }))} onChange={commit} /></> :
       field.type === 'number' ? <><UiText text={field.key} /><UiNumber label={field.key} value={Number(value)} min={field.min} max={field.max} disabled={node.locked} onChange={commit} /></> :
       field.type === 'color' ? <ColorField label={field.key} value={String(value)} disabled={node.locked} onChange={commit} /> :
       <Field label={field.key} value={field.type === 'json' ? JSON.stringify(value, null, 2) : String(value)} disabled={node.locked} multiline={field.type === 'json'} maxLength={50000}
         validate={next => { try { parsed(field.type === 'json' ? JSON.parse(next) : next); setError(''); return true; } catch (error) { setError(error instanceof Error ? error.message : String(error)); return false; } }}
         onChange={next => commit(field.type === 'json' ? JSON.parse(next) : next)} />}
    </>}
    {error && <UiText text={error} />}
  </div>;
}

export function Inspector({ document, selected, preview, onDocument, onNode, onDelete, onDuplicate, onReorder }: {
  document: DesignDocument; selected?: DesignNode; preview: boolean;
  onDocument: (document: DesignDocument) => void; onNode: (node: DesignNode) => void;
  onDelete: () => void; onDuplicate: () => void; onReorder: (direction: number) => void;
}) {
  const patch = (properties: Partial<DesignNode>) => { if (selected) onNode({ ...selected, ...properties }); };
  const numeric = (key: 'x' | 'y' | 'width' | 'height' | 'fontSize' | 'radius' | 'value', label: string, min = 0, max = 3000) => selected && <div className="field"><UiText text={label} height={24} /><UiNumber label={label} value={selected[key]} min={min} max={max} disabled={selected.locked} onChange={value => patch({ [key]: value })} /></div>;
  return <aside className="inspector" aria-label="属性面板">
    <div className="panel-heading"><UiText text="属性" /><UiText text={selected ? selected.kind : 'Page'} /></div>
    {preview ? <div className="preview-notice"><UiText text="正在预览" width="100%" /><UiText text="直接与画布上的 WinUI 控件交互。" width="100%" /><UiText text="返回设计模式以继续编辑。" width="100%" /></div> : <>
      <div className="selected-summary"><div><UiText text={selected?.name ?? '页面设置'} width="100%" /><UiText text={selected?.kind ?? '你的创作，从这里展开'} width="100%" /></div></div>
      {selected ? <>
        <Section title="图层"><Field label="名称" value={selected.name} maxLength={100} onChange={name => patch({ name })} />
          <div className="property-actions"><UiButton text="复制" icon="duplicate" label="复制图层 Ctrl+D" onClick={onDuplicate} /><UiButton icon="up" label="上移一层" onClick={() => onReorder(1)} /><UiButton icon="down" label="下移一层" onClick={() => onReorder(-1)} /><UiButton icon="trash" label="删除图层" onClick={onDelete} /></div>
        </Section>
        <Section title="位置与尺寸"><div className="field-grid">{numeric('x', 'X')}{numeric('y', 'Y')}{numeric('width', '宽度', 8)}{numeric('height', '高度', 4)}</div></Section>
        {textKinds.has(selected.kind) && <Section title="内容与文字">
          <Field label="文本" value={selected.text} disabled={selected.locked} onChange={text => patch({ text })} />
          {['TextBox','PasswordBox','AutoSuggestBox','ComboBox'].includes(selected.kind) && <Field label="占位文本" value={selected.placeholder} disabled={selected.locked} onChange={placeholder => patch({ placeholder })} />}
          <div className="field-grid">{numeric('fontSize', '字号', 8, 120)}<div className="field"><UiText text="字重" height={24} /><UiSelect label="字重" value={String(selected.fontWeight)} disabled={selected.locked} items={[400, 500, 600, 700].map(weight => ({ id: String(weight), text: String(weight) }))} onChange={value => patch({ fontWeight: Number(value) })} /></div></div>
          <ColorField label="文字颜色" value={selected.foreground} optional disabled={selected.locked} onChange={foreground => patch({ foreground })} />
        </Section>}
        {['Button','RepeatButton','HyperlinkButton','DropDownButton'].includes(selected.kind) && <Section title="按钮样式"><UiSegmented label="按钮样式" value={selected.variant} disabled={selected.locked} items={[{ id: ButtonVariant.Standard, text: 'Standard' }, { id: ButtonVariant.Accent, text: 'Accent' }, { id: ButtonVariant.Subtle, text: 'Subtle' }]} onChange={variant => patch({ variant: variant as ButtonVariant })} /></Section>}
        {checkedKinds.has(selected.kind) && <Section title="初始状态"><UiCheck label={selected.kind === 'ToggleSwitch' ? '默认开启' : '默认选中'} checked={selected.checked} disabled={selected.locked} onChange={checked => patch({ checked })} /></Section>}
        {valueKinds.has(selected.kind) && <Section title="数值">{numeric('value', 'value', selected.kind === 'NumberBox' ? -1000000 : selected.kind === 'RatingControl' ? -1 : 0, selected.kind === 'NumberBox' ? 1000000 : 100)}</Section>}
        {controlFields(selected.kind).length > 0 && <Section title={selected.kind}>{controlFields(selected.kind).map(field => <NativeProperty key={field.key} node={selected} field={field} onNode={onNode} />)}</Section>}
        <Section title="外观"><ColorField label={selected.kind === 'Rectangle' ? '填充颜色' : '背景颜色'} value={selected.background} optional disabled={selected.locked} onChange={background => patch({ background })} />{numeric('radius', '圆角', 0, 500)}<UiCheck label="启用控件" checked={selected.enabled} disabled={selected.locked} onChange={enabled => patch({ enabled })} /></Section>
        <Section title="图层状态"><UiCheck label="锁定位置与属性" checked={selected.locked} onChange={locked => patch({ locked })} /><UiCheck label="显示图层" checked={!selected.hidden} onChange={visible => patch({ hidden: !visible })} /></Section>
      </> : <>
        <Section title="页面"><Field label="页面名称" value={document.name} maxLength={100} onChange={name => onDocument({ ...document, name })} />
          <div className="field"><UiText text="画布预设" height={24} /><UiSelect label="画布预设" value={`${document.width}x${document.height}`} items={[
            { id: `${document.width}x${document.height}`, text: `当前 · ${document.width} × ${document.height}` },
            { id: '800x640', text: '应用页面 · 800 × 640' }, { id: '1440x900', text: '桌面 · 1440 × 900' }, { id: '768x1024', text: '平板 · 768 × 1024' }, { id: '390x844', text: '手机 · 390 × 844' },
          ].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)} onChange={value => { const [width, height] = value.split('x').map(Number); onDocument({ ...document, width, height }); }} /></div>
          <div className="field-grid"><div className="field"><UiText text="页面宽度" height={24} /><UiNumber label="页面宽度" value={document.width} min={320} onChange={width => onDocument({ ...document, width })} /></div><div className="field"><UiText text="页面高度" height={24} /><UiNumber label="页面高度" value={document.height} min={320} onChange={height => onDocument({ ...document, height })} /></div></div>
        </Section>
        <Section title="主题与背景"><div className="field"><UiText text="控件主题" height={24} /><UiSelect label="控件主题" value={document.theme} items={[{ id: ThemeMode.Light, text: '浅色' }, { id: ThemeMode.Dark, text: '深色' }, { id: ThemeMode.HighContrast, text: '高对比度' }]} onChange={theme => onDocument({ ...document, theme: theme as ThemeMode })} /></div><ColorField label="画布背景" value={document.background} onChange={background => onDocument({ ...document, background })} /></Section>
        <div className="inspector-tip"><UiText text="选择组件，在这里调整每一个细节。" width="100%" /></div>
      </>}
    </>}
  </aside>;
}

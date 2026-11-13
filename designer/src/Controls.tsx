/** Mounting adapters only. Rust owns control visuals, focus, editing, validation,
 * menus, modal state and pointer/keyboard behavior. No DOM control substitutes. */
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { SceneView, Button, ToggleButton, Segmented, SegmentedItem, TextBlock, StackPanel, TextBox, RichEditBox, AutoSuggestBox, NumberBox, ComboBox, CheckBox, Rectangle, ColorPicker, Flyout, InfoBar, ToolTip, type ButtonProps } from 'winui-wasm/react';
import { ButtonVariant, EventKind, HorizontalAlignment, Orientation, VerticalAlignment, ThemeMode, RendererBackend, OverlayPlacement, SegmentedStyle, type TextBoxController, type RichEditBoxController } from 'winui-wasm';
import { Icon } from './Icon';

export function Surface({ kind, children, width, height = 32, className = '', style, autoWidth = false, autoHeight = false }: {
  kind: string; children: ReactNode; width?: number | string; height?: number; className?: string; style?: CSSProperties; autoWidth?: boolean; autoHeight?: boolean;
}) {
  return <div className={`ui-control ${className}`} data-designer-ui={kind} style={{ width: width ?? (autoWidth ? 'max-content' : '100%'), height, ...style }}>
    <SceneView theme={ThemeMode.Light} backend={RendererBackend.Canvas2D} autoWidth={autoWidth} autoHeight={autoHeight} style={{ height: '100%' }}>{children}</SceneView>
  </div>;
}
export function UiText({ text, width = '100%', height = 24, className = '' }: {
  text: string; width?: number | string; height?: number; className?: string;
}) {
  return <Surface kind="TextBlock" width={width} height={height} autoHeight className={`ui-text ${className}`}>
    <TextBlock text={text} wrap verticalAlignment={VerticalAlignment.Center} />
  </Surface>;
}
function ActionContent({ text, icon }: { text: string; icon?: string }) {
  return <StackPanel orientation={Orientation.Horizontal} spacing={text && icon ? 8 : 0} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}>
    {icon && <Icon name={icon} />}
    {text && <TextBlock text={text} />}
  </StackPanel>;
}
export function UiButton({ text = '', label, icon, onClick, disabled = false, primary = false, width, height = 32, className = '', title }: {
  text?: string; label?: string; icon?: string; onClick?: () => void; disabled?: boolean; primary?: boolean;
  width?: number | string; height?: number; className?: string; title?: string;
}) {
  const options = { accessibleName: label ?? text, enabled: !disabled,
    horizontalAlignment: HorizontalAlignment.Stretch, toolTip: title || label ? <ToolTip text={title ?? label} /> : undefined, onClick } satisfies ButtonProps;
  return <div className={`ui-button ${className}`} style={{ width: width ?? 'max-content' }}>
    <Surface kind="Button" height={height} autoWidth={width === undefined} autoHeight>
      <Button {...options} variant={primary ? ButtonVariant.Accent : ButtonVariant.Standard}><ActionContent text={text} icon={icon} /></Button>
    </Surface>
  </div>;
}
export function UiToggleButton({ text, label, icon, checked, disabled = false, onChange }: {
  text: string; label: string; icon?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  return <div className="ui-button" style={{ width: 'max-content' }}>
    <Surface kind="ToggleButton" autoWidth autoHeight><ToggleButton accessibleName={label} toolTip={<ToolTip text={label} />} enabled={!disabled} isChecked={checked}
      horizontalAlignment={HorizontalAlignment.Stretch}
      onChecked={() => { if (!checked) onChange(true); }} onUnchecked={() => { if (checked) onChange(false); }}>
      <ActionContent text={text} icon={icon} />
    </ToggleButton></Surface>
  </div>;
}
export function UiSegmented({ label, value, items, onChange, disabled = false }: {
  label: string; value: string; items: { id: string; text: string; icon?: string }[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <Surface kind="Segmented" height={40}>
    <Segmented accessibleName={label} segmentedStyle={SegmentedStyle.Default}
      selectedIndex={items.findIndex(item => item.id === value)} enabled={!disabled}
      horizontalAlignment={HorizontalAlignment.Stretch} singleSelectionFollowsFocus
      onSelectionChanged={event => {
        const item = items[event.selectedIndex];
        if (item && item.id !== value) onChange(item.id);
      }}>
      {items.map(item => <SegmentedItem key={item.id} content={item.text} icon={item.icon} />)}
    </Segmented>
  </Surface>;
}
export function UiInput({ label, value, placeholder, onChange, onCommit, disabled = false, maxLength = 2000, multiline = false }: {
  label: string; value: string; placeholder?: string; onChange: (value: string) => void; onCommit?: () => void; disabled?: boolean; maxLength?: number; multiline?: boolean;
}) {
  const latest = useRef(onCommit); latest.current = onCommit;
  const Editor = multiline ? RichEditBox : TextBox;
  return <Surface kind={multiline ? 'RichEditBox' : 'TextBox'} height={multiline ? 144 : 32}><Editor accessibleName={label} text={value} placeholderText={placeholder} maxLength={maxLength} enabled={!disabled} acceptsReturn={multiline}
    horizontalAlignment={HorizontalAlignment.Stretch} onTextChanged={event => { if (event.text !== undefined && event.text !== value) onChange(event.text); }}
    onReady={(control: TextBoxController | RichEditBoxController) => { control.on(EventKind.LostFocus, () => latest.current?.()); }} /></Surface>;
}
export function UiSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Surface kind="AutoSuggestBox"><AutoSuggestBox accessibleName="搜索组件" placeholderText="搜索组件…" queryIcon text={value} items={[]}
    horizontalAlignment={HorizontalAlignment.Stretch} onTextChanged={event => { if (event.text !== undefined && event.text !== value) onChange(event.text); }} /></Surface>;
}
export function UiNumber({ label, value, min = 0, max = 3000, onChange, disabled = false }: {
  label: string; value: number; min?: number; max?: number; onChange: (value: number) => void; disabled?: boolean;
}) {
  return <Surface kind="NumberBox"><NumberBox accessibleName={label} value={value} minimum={min} maximum={max} enabled={!disabled}
    horizontalAlignment={HorizontalAlignment.Stretch} onValueChanged={event => { if (event.newValue != null && event.newValue !== value) onChange(event.newValue); }} /></Surface>;
}
export function UiSelect({ label, value, items, onChange, disabled = false, width }: {
  label: string; value: string; items: { id: string; text: string }[]; onChange: (value: string) => void; disabled?: boolean; width?: number | string;
}) {
  return <Surface kind="ComboBox" width={width}><ComboBox accessibleName={label} items={items} selectedIndex={items.findIndex(item => item.id === value)} enabled={!disabled}
    horizontalAlignment={HorizontalAlignment.Stretch} onSelectionChanged={event => { const item = items[event.selectedIndex ?? -1]; if (item && item.id !== value) onChange(item.id); }} /></Surface>;
}
export function UiCheck({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <Surface kind="CheckBox" height={32}><CheckBox accessibleName={label} text={label} isChecked={checked} enabled={!disabled}
    horizontalAlignment={HorizontalAlignment.Stretch} onChecked={() => { if (!checked) onChange(true); }} onUnchecked={() => { if (checked) onChange(false); }} /></Surface>;
}
export function UiColor({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const canonical = (color: string) => color.toLowerCase().length === 7 ? `${color.toLowerCase()}ff` : color.toLowerCase();
  return <Surface kind="ColorPicker" width={44}><Button accessibleName={`${label}选色`} enabled={!disabled}>
    <Rectangle width={16} height={16} fill={value || '#ffffff'} />
    <Button.Flyout><Flyout width={310} placement={OverlayPlacement.Left}><ColorPicker width={286} color={value || '#ffffff'} isAlphaEnabled={false} isColorChannelTextInputVisible={false} onColorChanged={event => {
      const next = event.newColor ?? event.color;
      // Configuration notifications can normalize RGB to RGBA; they are not edits.
      if (next && canonical(next) !== canonical(value || '#ffffff')) onChange(next.length === 9 && next.endsWith('ff') ? next.slice(0, 7) : next);
    }} /></Flyout></Button.Flyout>
  </Button></Surface>;
}
export function UiNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="notice-host"><Surface kind="InfoBar" height={58}><InfoBar title="设计器" message={message} isOpen isClosable onClosed={onClose} /></Surface></div>;
}

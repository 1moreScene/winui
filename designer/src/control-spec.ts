import * as SDK from 'winui-wasm';
import { controlFields, textKinds, checkedKinds, valueKinds, type ControlKind } from './catalog';
import type { DesignNode, DesignDocument } from './model';

/** One declaration tree drives the live SDK adapter and portable TSX export. */
const elementBrand: unique symbol = Symbol('designer-sdk-element');
export interface ElementSpec { [elementBrand]: true; component: string; props: Record<string, unknown>; children: ElementSpec[] }
export const element = (component: string, props: Record<string, unknown> = {}, children: ElementSpec[] = []): ElementSpec => ({ [elementBrand]: true, component, props, children });
export const enumeration = (name: keyof typeof SDK, value: string) => ({ $enum: name, value });
const text = (value: string) => element('TextBlock', { text: value, wrap: true });
const accent = { resource: 'AccentFillColorDefaultBrush' };
const menuParts = new Set<ControlKind>(['MenuFlyoutItem','ToggleMenuFlyoutItem','RadioMenuFlyoutItem','MenuFlyoutSubItem','MenuFlyoutSeparator']);
const overlayKinds = new Set<ControlKind>(['Popup','Flyout','MenuFlyout','ToolTip','CommandBarFlyout','ContentDialog','TeachingTip']);
const noDecoration = new Set<ControlKind>(['Rectangle','Line','Path','Polygon','Polyline']);

function encodeEnums(value: unknown, key: string, kind: ControlKind): unknown {
  if (Array.isArray(value)) return value.map(item => encodeEnums(item, key, kind));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => {
    if (childKey === 'unit' && typeof child === 'string') return [childKey, enumeration('GridUnit', child)];
    if (childKey === 'iconSymbol' && typeof child === 'string') return [childKey, enumeration('Symbol', child)];
    if (childKey === 'mode' && kind === 'SwipeControl' && typeof child === 'string') return [childKey, enumeration('SwipeMode', child)];
    if (childKey === 'kind' && kind === 'TableView' && key === 'columns' && typeof child === 'string') return [childKey, enumeration('TableViewColumnKind', child)];
    return [childKey, encodeEnums(child, childKey, kind)];
  }));
  return value;
}
function options(node: DesignNode) {
  const result: Record<string, unknown> = {};
  for (const field of controlFields(node.kind)) {
    const value = node.properties?.[field.key] ?? field.value;
    result[field.key] = field.type === 'enum' ? enumeration(field.enumName!, String(value)) : encodeEnums(value, field.key, node.kind);
  }
  if (textKinds.has(node.kind)) {
    result.text = node.text;
    if (!menuParts.has(node.kind)) { result.fontSize = node.fontSize; result.fontWeight = node.fontWeight; }
  }
  if (checkedKinds.has(node.kind)) result[node.kind === 'ToggleSwitch' ? 'isOn' : 'isChecked'] = node.checked;
  if (valueKinds.has(node.kind)) result.value = node.value;
  if (['Button','RepeatButton','HyperlinkButton','DropDownButton'].includes(node.kind)) result.variant = enumeration('ButtonVariant', node.variant);
  if (['TextBox','PasswordBox','AutoSuggestBox','ComboBox'].includes(node.kind)) result.placeholderText = node.placeholder;
  return result;
}
function geometry(node: DesignNode, layer: number) {
  return { name: node.id, accessibleName: node.name, canvasLeft: node.x, canvasTop: node.y, zIndex: layer,
    width: node.width, height: node.height, enabled: node.enabled, visible: !node.hidden };
}

export function controlSpec(node: DesignNode, layer: number, prefix = 'control'): ElementSpec[] {
  const kind = node.kind, specific = options(node), common = geometry(node, layer);
  const props: Record<string, unknown> = { ...common, ...specific };
  if (node.background) props[noDecoration.has(kind) ? 'fill' : 'background'] = node.background;
  if (node.foreground && !noDecoration.has(kind)) props.foreground = node.foreground;
  if (kind === 'Rectangle') { props.radiusX = node.radius; props.radiusY = node.radius; }
  else if (!noDecoration.has(kind) && node.radius !== 4) props.cornerRadius = node.radius;
  const native = (children: ElementSpec[] = []) => element(kind, props, children);
  const sample = text(kind);
  const inner = (component: string, childProps: Record<string, unknown> = {}, children: ElementSpec[] = []) => element(component, childProps, children);
  const menu = () => element('MenuFlyout', { menuItems: [{ id: 'one', text: 'Item 1' }, { id: 'two', text: 'Item 2' }] });
  const invoker = (children: ElementSpec[] = [], extra: Record<string, unknown> = {}) => element('Button', { ...common, text: kind, ...extra }, children);

  if (menuParts.has(kind)) {
    const itemProps = kind === 'MenuFlyoutSeparator' ? { visible: !node.hidden } : { ...specific, accessibleName: node.name, enabled: node.enabled, visible: !node.hidden };
    const item = element(kind, itemProps, kind === 'MenuFlyoutSubItem' ? [element('MenuFlyoutItem', { text: 'Item' })] : []);
    return [invoker([element('Button.Flyout', {}, [element('MenuFlyout', {}, [element('MenuFlyoutItem', { text: 'Before' }), item, element('MenuFlyoutItem', { text: 'After' })])])])];
  }
  if (overlayKinds.has(kind)) {
    if (kind === 'ContentDialog') return [invoker([], { onClick: { $call: `${prefix}Dialog`, method: 'showAsync' } }),
      element('ContentDialog', { ...specific, onReady: { $bind: `${prefix}Dialog`, controller: 'ContentDialogController' } }, [text('ContentDialog content')])];
    if (kind === 'ToolTip') return [invoker([], { toolTip: element('ToolTip', specific) })];
    if (kind === 'Popup' || kind === 'TeachingTip') {
      const target = `${node.id}-target`, state = `${prefix}Open`;
      return [invoker([], { name: target, onClick: { $toggle: state } }), element(kind,
        { ...specific, target, isOpen: { $state: state }, onClosed: { $set: state, value: false } }, kind === 'Popup' ? [text('Popup content')] : [])];
    }
    const flyout = element(kind, specific, kind === 'Flyout' ? [sample] : []);
    return [invoker([element('Button.Flyout', {}, [flyout])])];
  }
  if (kind === 'UICommand' || kind === 'StandardCommand') return [element(kind, { name: node.id, ...specific }),
    element('Button', { ...common, name: `${node.id}-button`, command: node.id, text: kind })];
  if (kind === 'NavigationView') return [element('SceneNavigationView', { layout: common, ...specific },
    [element('NavigationViewContent', { slot: enumeration('NavigationViewSlot', 'Content') }, [sample])])];
  if (kind === 'NavigationViewItem') return [element('SceneNavigationView', { layout: { ...common, name: `${node.id}-owner` }, items: [{ id: 'home', text: 'Home' }] },
    [element('NavigationViewContent', { slot: enumeration('NavigationViewSlot', 'PaneFooter') }, [element('NavigationViewItem', { ...specific, name: node.id, accessibleName: node.name })])])];
  if (kind === 'SegmentedItem') return [element('Segmented', { ...common, name: `${node.id}-owner`, segmentedStyle: enumeration('SegmentedStyle', 'Default') },
    [element('SegmentedItem', { ...specific, name: node.id, accessibleName: node.name }), element('SegmentedItem', { content: 'Item 2' })])];
  if (kind === 'Frame') return [element('SceneFrame', { ...common, pages: [{ key: 'sample', title: 'Page', content: { kind: enumeration('NodeKind', 'Page'), children: [{ kind: enumeration('NodeKind', 'TextBlock'), properties: { text: 'Frame / Page' } }] } }], onReady: { $init: 'navigate', argument: 'sample' } })];
  if (kind === 'SplitView') return [element(kind, { ...props, pane: text('Pane') }, [sample])];
  if (kind === 'SemanticZoom') return [element(kind, { ...props, zoomedInView: text('Zoomed in'), zoomedOutView: text('Zoomed out') })];
  if (kind === 'MenuBarItem') return [element('MenuBar', common, [element('MenuBarItem', { ...specific, items: [{ id: 'item', text: 'Item' }] })])];
  if (kind === 'TickBar') {
    const source = `${node.id}-slider`;
    const { orientation, ...tickProps } = props;
    return [element('Slider', { ...common, name: source, height: 32, minimum: 0, maximum: 100, tickFrequency: 10, value: 50, orientation }),
      element('TickBar', { ...tickProps, canvasTop: node.y + 40, height: Math.max(8, node.height - 40), source })];
  }
  if (kind === 'RichTextBlockOverflow') return [element('RichTextBlock', { ...common, name: `${node.id}-source`, height: 28, text: 'RichTextBlock content flows into RichTextBlockOverflow. '.repeat(12), overflowContentTarget: node.id }),
    element(kind, { ...props, canvasTop: node.y + 36, height: Math.max(32, node.height - 36) })];
  if (kind === 'ParallaxView') return [element('ScrollViewer', { ...common, name: `${node.id}-source` }, [element('Grid', { height: Math.max(500, node.height * 2) },
    [element('ParallaxView', { ...specific, name: node.id, source: `${node.id}-source` }, [sample])])])];
  if (kind === 'FontIcon') props.glyph = String(node.properties.glyph ?? '\uE73E').replace(/\\u([a-f\d]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (kind === 'SymbolIcon') return [native()];
  if (kind === 'IconSourceElement') { props.iconSource = { kind: enumeration('IconSourceKind', 'Symbol'), symbol: props.symbol }; delete props.symbol; }
  if (kind === 'Rectangle' || kind === 'Path' || kind === 'Polygon') props.fill = node.background || accent;
  if (kind === 'Ellipse') props.background = node.background || accent;
  if (kind === 'Line' || kind === 'Polygon' || kind === 'Polyline') props.stroke = node.background || accent;
  if (kind === 'SplitButton' || kind === 'ToggleSplitButton' || kind === 'DropDownButton') return [native([element(`${kind}.Flyout`, {}, [menu()])])];
  if (['Grid','StackPanel','Canvas','Border','Viewbox','RelativePanel','WrapPanel','LayoutPanel','Expander','SwipeControl'].includes(kind)) return [native([sample])];
  if (kind === 'ItemsPresenter') return [native([element('StackPanel', {}, [text('Item 1'),text('Item 2')])])];
  if (['ItemsStackPanel','ItemsWrapGrid','VariableSizedWrapGrid'].includes(kind)) return [native([text('Item 1'),text('Item 2'),text('Item 3')])];
  if (['ScrollViewer','ScrollView','ScrollContentPresenter','RefreshContainer'].includes(kind)) {
    const content = element('StackPanel', { spacing: 16 }, Array.from({ length: 12 }, (_, index) => text(`Item ${index + 1}`)));
    return [native(kind === 'RefreshContainer' ? [element('ScrollViewer', {}, [content])] : [content])];
  }
  return [native()];
}

function isElement(value: unknown): value is ElementSpec { return !!value && typeof value === 'object' && elementBrand in value; }
function enumCode(name: string, value: string) {
  const source = (SDK as unknown as Record<string, Record<string, string>>)[name];
  const member = Object.entries(source).find(([, item]) => item === value)?.[0];
  if (!member) throw new Error(`Invalid ${name}: ${value}`);
  return `${name}.${member}`;
}

export function documentSource(doc: DesignDocument): string {
  const nodes = doc.nodes.flatMap((node, layer) => controlSpec(node, layer, `element${layer}`));
  const imports = new Set(['SceneView','Canvas']), enums = new Set(['ThemeMode','RendererBackend']);
  const bindings = new Map<string, string>(), states = new Set<string>();
  function valueCode(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (isElement(value)) return jsx(value);
    if (Array.isArray(value)) return `[${value.map(valueCode).join(', ')}]`;
    const data = value as Record<string, unknown>;
    if ('$enum' in data) { enums.add(String(data.$enum)); return enumCode(String(data.$enum), String(data.value)); }
    if ('$state' in data) { states.add(String(data.$state)); return String(data.$state); }
    if ('$bind' in data) { bindings.set(String(data.$bind), String(data.controller)); return `control => { ${data.$bind}.current = control; }`; }
    if ('$call' in data) return `() => { void ${data.$call}.current?.${data.method}(); }`;
    if ('$toggle' in data) { states.add(String(data.$toggle)); return `() => set${data.$toggle}(value => !value)`; }
    if ('$set' in data) { states.add(String(data.$set)); return `() => set${data.$set}(${JSON.stringify(data.value)})`; }
    if ('$init' in data) return `control => { control.${data.$init}(${JSON.stringify(data.argument)}); }`;
    return `{ ${Object.entries(data).map(([key, value]) => `${JSON.stringify(key)}: ${valueCode(value)}`).join(', ')} }`;
  }
  function jsx(spec: ElementSpec): string {
    imports.add(spec.component.split('.')[0]);
    const props = Object.entries(spec.props).map(([key, value]) => `${key}={${valueCode(value)}}`).join(' ');
    return spec.children.length ? `<${spec.component} ${props}>\n${spec.children.map(child => '  ' + jsx(child).replaceAll('\n','\n  ')).join('\n')}\n</${spec.component}>` : `<${spec.component} ${props} />`;
  }
  const body = nodes.map(spec => '        ' + jsx(spec).replaceAll('\n', '\n        ')).join('\n');
  const hooks = [...(bindings.size ? ['useRef'] : []), ...(states.size ? ['useState'] : [])];
  const locals = [...bindings].map(([name, type]) => `  const ${name} = useRef<${type} | null>(null);`).concat([...states].map(name => `  const [${name}, set${name}] = useState(false);`));
  return `${hooks.length ? `import { ${hooks.join(', ')} } from 'react';\n` : ''}import { ${[...imports].join(', ')} } from 'winui-wasm/react';\nimport { ${[...enums, ...[...bindings.values()].map(type => `type ${type}`)].join(', ')} } from 'winui-wasm';\n\n// Mount inside WinUIProvider with an initialized WinUI runtime.\nexport function DesignedPage() {\n${locals.join('\n')}\n  return (\n    <SceneView theme={ThemeMode.${doc.theme}} backend={RendererBackend.Canvas2D} style={{ width: ${doc.width}, height: ${doc.height} }}>\n      <Canvas width={${doc.width}} height={${doc.height}} background={${JSON.stringify(doc.background)}} clip>\n${body}\n      </Canvas>\n    </SceneView>\n  );\n}\n`;
}

export { isElement };

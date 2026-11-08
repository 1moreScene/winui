import {
  WinUI,
  ThemeMode,
  PaneDisplayMode,
  ItemKind,
  DisplayMode,
  EventKind,
  type NavigationViewOptions,
} from "../src/index";
// This module is typechecked but never executed. @ts-expect-error becomes a
// compiler failure if a public property is accidentally widened to string.
function apiContract(sdk: WinUI, host: HTMLElement) {
  const view = sdk.navigationView(host, {
    theme: ThemeMode.Dark,
    paneDisplayMode: PaneDisplayMode.Left,
    items: [{ id: "home", text: "Home", kind: ItemKind.Item }],
  });
  view.update({ theme: ThemeMode.HighContrast });
  view.batch([{ paneDisplayMode: PaneDisplayMode.Auto }, { isPaneOpen: true }]);
  const off = view.on(EventKind.SelectionChanged, (event) =>
    console.log(event.itemId),
  );
  off();
  const properties: Readonly<NavigationViewOptions> = view.properties;
  const mode: DisplayMode = view.snapshot.displayMode;
  // @ts-expect-error raw theme strings must not compile
  view.update({ theme: "Dark" });
  // @ts-expect-error raw pane mode strings must not compile
  view.update({ paneDisplayMode: "Top" });
  // @ts-expect-error incompatible enum must not compile
  view.update({ theme: PaneDisplayMode.Top });
  // @ts-expect-error missing enum member must not compile
  view.update({ theme: ThemeMode.Drak });
  // @ts-expect-error raw item kind must not compile
  sdk.navigationView(host, { items: [{ id: "x", text: "x", kind: "Header" }] });
  // @ts-expect-error events are runtime enum members too
  view.on("selectionChanged", () => {});
  view.dispose();
  return { properties, mode };
}
function contentTypeContract(sdk: WinUI, host: HTMLElement) {
  // @ts-expect-error content templates require the runtime ContentKind enum
  sdk.navigationView(host, { contentNode: { kind: "Grid" } });
  // @ts-expect-error raw alignments must not compile
  sdk.navigationView(host, { contentNode: { horizontalAlignment: "Center" } });
  // @ts-expect-error grid units require the runtime GridUnit enum
  sdk.navigationView(host, { contentNode: { columns: [{ unit: "Auto" }] } });
}
void contentTypeContract;
void apiContract;
import {
  ButtonVariant,
  ClickMode,
  RendererBackend,
  HorizontalAlignment,
  TextTrimming,
  Orientation,
  AnimationEasing,
  AnimationResult,
  EasingFunction,
  EasingMode,
  GradientKind,
  BrushMappingMode,
  GradientSpread,
} from "../src/index";
function sceneContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host, { backend: RendererBackend.WebGL2 });
  const panel = scene.root.stack({ orientation: Orientation.Horizontal });
  const button = panel.button({
    text: "Save",
    variant: ButtonVariant.Accent,
    clickMode: ClickMode.Release,
  });
  button.update({ horizontalAlignment: HorizontalAlignment.Center });
  button.onClick((e) => console.log(e.target));
  scene.batch(() => button.update({ text: "Saved" }));
  panel.text({ trimming: TextTrimming.CharacterEllipsis });
  const animation = panel.animate(
    { translationX: 120, opacity: 0.6 },
    { easing: AnimationEasing.EaseOut },
  );
  void animation.finished.then(
    (result) => result === AnimationResult.Completed,
  );
  animation.cancel();
  panel.animate(
    {
      rotation: [
        { offset: 0.5, value: 180 },
        { offset: 1, value: 0 },
      ],
    },
    {
      easingFunction: EasingFunction.Bounce,
      easingMode: EasingMode.EaseOut,
    },
  );
  panel.update({
    background: {
      kind: GradientKind.Radial,
      mappingMode: BrushMappingMode.Absolute,
      spreadMethod: GradientSpread.Reflect,
      stops: [
        { offset: 0, color: "#ffff00" },
        { offset: 1, color: "#0000ff" },
      ],
    },
  });
  // @ts-expect-error easing family must use the runtime enum
  panel.animate({ rotation: 45 }, { easingFunction: "Bounce" });
  // @ts-expect-error easing direction must use the runtime enum
  panel.animate({ rotation: 45 }, { easingMode: "EaseOut" });
  // @ts-expect-error gradient kind must use the runtime enum
  panel.update({ background: { kind: "radialGradient", stops: [] } });
  panel.update({
    background: {
      kind: GradientKind.Radial,
      // @ts-expect-error spread must use the runtime enum
      spreadMethod: "Repeat",
      stops: [],
    },
  });
  panel.update({
    background: {
      kind: GradientKind.Radial,
      // @ts-expect-error coordinate mapping must use the runtime enum
      mappingMode: "Absolute",
      stops: [],
    },
  });
  // @ts-expect-error per-keyframe easing must use the runtime enum
  panel.animate({ rotation: [{ offset: 1, value: 0, easing: "Discrete" }] });
  panel.update({
    acrylic: {
      tintColor: "#ffffff",
      tintOpacity: 0.2,
      fallbackColor: "#f3f3f3",
    },
  });
  // @ts-expect-error raw easing strings must fail
  panel.animate({ opacity: 1 }, { easing: "EaseOut" });
  // @ts-expect-error incompatible enums must fail
  panel.animate({ opacity: 1 }, { easing: ThemeMode.Dark });
  // @ts-expect-error layout dimensions are not presentation tracks
  panel.animate({ width: 200 });
  // @ts-expect-error raw Button style strings must fail
  button.update({ variant: "Accent" });
  // @ts-expect-error raw ClickMode strings must fail
  button.update({ clickMode: "Release" });
  // @ts-expect-error an incompatible enum must fail
  button.update({ variant: ThemeMode.Dark });
  // @ts-expect-error raw renderer strings must fail
  sdk.scene(host, { backend: "WebGL2" });
  // @ts-expect-error wrong enum member must fail
  button.update({ variant: ButtonVariant.Accnt });
  // @ts-expect-error raw alignment strings must fail
  panel.update({ horizontalAlignment: "Center" });
  // @ts-expect-error raw trimming strings must fail
  panel.text({ trimming: "CharacterEllipsis" });
  // @ts-expect-error no raw internal protocol is required or accepted as button options
  panel.button({ kind: "Button", pointer: 123 });
  scene.dispose();
}
void sceneContract;

import { FontStyle, ImageStretch } from "../src/index";
function basicContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const check = scene.root.checkBox({
    text: "Option",
    isChecked: null,
    isThreeState: true,
  });
  check.onCheckedChanged((e) => console.log(e.isChecked));
  check.invoke();
  check.update({ isChecked: true });
  scene.root.toggleButton({ text: "Pin" });
  scene.root.text({ text: "Italic", fontStyle: FontStyle.Italic });
  scene.root.image({
    source: "/photo.jpg",
    stretch: ImageStretch.UniformToFill,
  });
  // @ts-expect-error checked state is a nullable boolean
  check.update({ isChecked: "mixed" });
  // @ts-expect-error three-state flag is a boolean
  check.update({ isThreeState: "true" });
  // @ts-expect-error font style requires the runtime enum
  scene.root.text({ fontStyle: "Italic" });
  // @ts-expect-error image stretch requires the runtime enum
  scene.root.image({ stretch: "UniformToFill" });
  scene.dispose();
}
void basicContract;

function selectionInputContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const radios = scene.root.radioButtons({
    header: "Options",
    items: ["One", { text: "Two", enabled: false }],
    selectedIndex: 0,
    maxColumns: 2,
  });
  radios.onSelectionChanged((event) =>
    console.log(event.selectedIndex, radios.selectedItem),
  );
  radios.update({ selectedIndex: -1 });
  const radio = scene.root.radioButton({
    text: "Choice",
    groupName: "choices",
    isChecked: true,
  });
  radio.onCheckedChanged((event) => console.log(event.isChecked));
  const toggle = scene.root.toggleSwitch({
    header: "Work",
    isOn: true,
    fontSize: 14,
  });
  toggle.onToggled((event) => console.log(event.isOn));
  toggle.toggle();
  // @ts-expect-error group selection is a number
  radios.update({ selectedIndex: "0" });
  // @ts-expect-error switch value is a boolean
  toggle.update({ isOn: "true" });
  // @ts-expect-error radio has no three-state user cycle
  scene.root.radioButton({ isThreeState: true });
  scene.dispose();
}
void selectionInputContract;
import {
  ScrollMode,
  ScrollBarVisibility,
  ZoomMode,
  PasswordRevealMode,
} from "../src/index";
function textScrollContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const text = scene.root.textBox({ header: "Name", placeholderText: "Name" });
  text.select(0, 3);
  text.undo();
  text.redo();
  text.onTextChanged((e) => console.log(e.text));
  const password = scene.root.passwordBox({
    passwordRevealMode: PasswordRevealMode.Peek,
  });
  password.onPasswordChanged((e) => console.log(e.target));
  const scroll = scene.root.scrollViewer({
    verticalScrollMode: ScrollMode.Enabled,
    verticalScrollBarVisibility: ScrollBarVisibility.Auto,
    zoomMode: ZoomMode.Enabled,
  });
  scroll.changeView({ verticalOffset: 30, zoomFactor: 2 });
  // @ts-expect-error finite values require the runtime enum
  password.update({ passwordRevealMode: "Visible" });
  // @ts-expect-error incompatible enum
  scroll.update({ horizontalScrollMode: ScrollBarVisibility.Auto });
  // @ts-expect-error misspelled enum member
  scroll.update({ zoomMode: ZoomMode.Enabeld });
  // @ts-expect-error no untyped string escape hatch
  scroll.update({ verticalScrollBarVisibility: "Auto" });
  return scene;
}
void textScrollContract;
function globalHostContract(sdk: WinUI, host: HTMLElement) {
  const lease = sdk.installGlobalScrollbars(host);
  lease.refresh();
  console.log(lease.diagnostics.managed);
  lease.dispose();
  const scene = sdk.scene(host);
  const viewer = scene.root.scrollViewer();
  viewer.setHostMetrics(
    {
      viewportWidth: 300,
      viewportHeight: 200,
      extentWidth: 1000,
      extentHeight: 800,
      horizontalOffset: 0,
      verticalOffset: 100,
    },
    host.id,
  );
  // @ts-expect-error host metrics require the full typed dimensions
  viewer.setHostMetrics({ extentHeight: 800 });
  // @ts-expect-error scopes are actual DOM roots, not selectors
  sdk.installGlobalScrollbars("#app");
  // @ts-expect-error policy is boolean
  void WinUI.create({ globalScrollbars: "false" });
  return scene;
}
void globalHostContract;

function progressContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const bar = scene.root.progressBar({ value: 50, showPaused: true });
  const ring = scene.root.progressRing({
    isActive: true,
    isIndeterminate: false,
    minimum: -10,
    maximum: 10,
    value: 2,
  });
  const off = bar.onValueChanged((e) => {
    const value: number | undefined = e.value;
    console.log(value);
  });
  off();
  ring.update({ isActive: false });
  // @ts-expect-error finite properties retain boolean types
  ring.update({ isIndeterminate: "false" });
  // @ts-expect-error ProgressBar has no IsActive property
  bar.update({ isActive: false });
  // @ts-expect-error custom AnimatedVisual sources are not silently accepted
  ring.update({ determinateSource: {} });
  // @ts-expect-error value is numeric
  bar.update({ value: "50" });
  ring.dispose();
  bar.dispose();
  scene.dispose();
}
void progressContract;

import { Stretch, StretchDirection } from "../src/index";
function nextBasicContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const vb = scene.root.viewbox({
    stretch: Stretch.Fill,
    stretchDirection: StretchDirection.UpOnly,
  });
  const grid = vb.grid({ width: 100, height: 50 });
  grid.text({ text: "Scale me" });
  const repeat = scene.root.repeatButton({
    text: "Hold",
    delay: 500,
    interval: 33,
  });
  const off = repeat.onClick(() => {});
  off();
  repeat.update({ interval: 50 });
  // @ts-expect-error finite direction is a runtime enum
  vb.update({ stretchDirection: "Both" });
  // @ts-expect-error finite stretch is a runtime enum
  vb.update({ stretch: "Fill" });
  // @ts-expect-error wrong enum must fail
  vb.update({ stretch: StretchDirection.Both });
  // @ts-expect-error Viewbox has no Padding
  vb.update({ padding: [1, 1, 1, 1] });
  // @ts-expect-error repeat interval is numeric
  repeat.update({ interval: "33" });
  repeat.dispose();
  vb.dispose();
  scene.dispose();
}
void nextBasicContract;

import { Symbol } from '../src/index';
function iconContract(sdk: WinUI, host: HTMLElement) {
  const scene = sdk.scene(host);
  const icon = scene.root.symbolIcon({ symbol: Symbol.Accept });
  icon.update({ symbol: Symbol.Emoji });
  // @ts-expect-error requires the public enum
  icon.update({ symbol: 'Accept' });
  // @ts-expect-error wrong finite enum
  icon.update({ symbol: Stretch.Fill });
  scene.root.bitmapIcon({ uriSource: 'image.png', showAsMonochrome: false });
  icon.dispose(); scene.dispose();
}
void iconContract;

import {OverlayPlacement,MenuEntryKind} from '../src/index';
function floatingContract(ui:WinUI,host:HTMLElement) {
 const s=ui.scene(host);const owner=s.root.button({text:'Open'});const flyout=s.root.flyout({placement:OverlayPlacement.Top});flyout.showAt(owner);flyout.hide();
 // @ts-expect-error placement requires the runtime enum
 flyout.update({placement:'Top'});
 // @ts-expect-error unrelated finite enum is rejected
 flyout.update({placement:ThemeMode.Dark});
 const menu=s.root.menuFlyout({menuItems:[{id:'a',kind:MenuEntryKind.Toggle}]});
 // @ts-expect-error menu kind requires a named enum
 menu.update({menuItems:[{id:'a',kind:'Toggle'}]});
 s.root.slider({orientation:Orientation.Vertical,stepFrequency:0.5});
 // @ts-expect-error raw orientation strings are rejected
 s.root.slider({orientation:'Vertical'});
 flyout.dispose();menu.dispose();s.dispose();
}
void floatingContract;

import {SplitViewDisplayMode,SplitViewPanePlacement,LightDismissOverlayMode,StandardCommandKind,ParallaxSourceOffsetKind} from '../src/index';
function viewCommandContract(ui:WinUI,host:HTMLElement){
 const s=ui.scene(host),c=s.root.standardCommand({standardKind:StandardCommandKind.Save});
 s.root.button({command:c,commandParameter:{document:7}});c.onCanExecuteRequested(e=>{e.canExecute=true;});
 const split=s.root.splitView({displayMode:SplitViewDisplayMode.CompactOverlay,panePlacement:SplitViewPanePlacement.Right,lightDismissOverlayMode:LightDismissOverlayMode.On});
 split.pane().text({text:'Pane'});split.content().text({text:'Content'});
 // @ts-expect-error native finite choice requires a runtime enum
 split.update({displayMode:'Overlay'});
 // @ts-expect-error incompatible enum
 split.update({panePlacement:ThemeMode.Dark});
 // @ts-expect-error standard command kind requires a runtime enum
 c.update({standardKind:'Save'});
 // @ts-expect-error wrong enum
 c.update({standardKind:SplitViewDisplayMode.Overlay});
 s.root.parallaxView({horizontalSourceOffsetKind:ParallaxSourceOffsetKind.Absolute});
 // @ts-expect-error raw offset kind is rejected
 s.root.parallaxView({verticalSourceOffsetKind:'Relative'});
 c.execute({document:7});c.dispose();s.dispose();
}
void viewCommandContract;

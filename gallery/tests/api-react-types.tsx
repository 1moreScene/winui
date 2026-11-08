import {
  Button,
  CheckBox,
  Grid,
  Image,
  NavigationView,
  SceneView,
  TextBlock,
  ToggleButton,
} from "../src/react";
import {
  ClickMode,
  FontStyle,
  ImageStretch,
  PaneDisplayMode,
  RendererBackend,
  ThemeMode,
} from "../src/index";
// Typechecked only: direct props retain the SDK's enum, callback and tuple contracts.
function directReactContract() {
  return (
    <SceneView backend={RendererBackend.Canvas2D} theme={ThemeMode.Light}>
      <Grid padding={[16, 16, 16, 16]}>
        <TextBlock text="Hello" fontStyle={FontStyle.Italic} />
        <Button
          text="Save"
          enabled
          clickMode={ClickMode.Release}
          onClick={(event) => console.log(event.target)}
        />
        <CheckBox
          text="Option"
          isChecked={null}
          isThreeState
          onIndeterminate={(event) => console.log(event.isChecked)}
        />
        <ToggleButton text="Pin" isChecked />
        <Image source="/photo.jpg" stretch={ImageStretch.Uniform} />
      </Grid>
    </SceneView>
  );
}
const navigation = (
  <NavigationView
    items={[{ id: "home", text: "Home" }]}
    paneDisplayMode={PaneDisplayMode.Left}
  />
);
// @ts-expect-error React controls no longer require or accept an options wrapper.
const obsolete = <Button options={{ text: "Save" }} />;
// @ts-expect-error Runtime enums remain required by direct props.
const rawEnum = <Button text="Save" clickMode="Release" />;
// @ts-expect-error Checked state is a nullable boolean.
const rawState = <CheckBox isChecked="mixed" />;
void [directReactContract, navigation, obsolete, rawEnum, rawState];

import {
  RadioButtons as ReactRadioButtons,
  RadioButton as ReactRadioButton,
  ToggleSwitch as ReactToggleSwitch,
} from "../src/react";
const radioGroup = (
  <ReactRadioButtons
    items={["One", { text: "Two", enabled: false }]}
    selectedIndex={0}
    maxColumns={2}
    onSelectionChanged={(e) => console.log(e.selectedIndex)}
  />
);
const namedRadio = (
  <ReactRadioButton text="Theme" groupName="theme" isChecked />
);
const switchControl = (
  <ReactToggleSwitch
    header="Work"
    isOn
    onToggled={(e) => console.log(e.isOn)}
  />
);
// @ts-expect-error isOn is a boolean.
const invalidSwitch = <ReactToggleSwitch isOn="true" />;
// @ts-expect-error selectedIndex is a number.
const invalidGroup = <ReactRadioButtons selectedIndex="0" />;
// @ts-expect-error direct props do not accept an options wrapper.
const invalidRadio = <ReactRadioButton options={{ text: "Wrong" }} />;
void [
  radioGroup,
  namedRadio,
  switchControl,
  invalidSwitch,
  invalidGroup,
  invalidRadio,
];
import { TextBox, PasswordBox, ScrollViewer } from "../src/react";
import {
  ScrollMode,
  ScrollBarVisibility,
  ZoomMode,
  PasswordRevealMode,
} from "../src/index";
function textScrollReactContract() {
  return (
    <>
      <TextBox
        placeholderText="Name"
        onTextChanged={(e) => console.log(e.text)}
      />
      <PasswordBox passwordRevealMode={PasswordRevealMode.Peek} />
      <ScrollViewer
        zoomMode={ZoomMode.Enabled}
        verticalScrollMode={ScrollMode.Auto}
        verticalScrollBarVisibility={ScrollBarVisibility.Auto}
      >
        <TextBlock text="Content" />
      </ScrollViewer>
    </>
  );
}
// @ts-expect-error extra options wrapper is not a public prop
const invalidTextOptions = <TextBox options={{ text: "value" }} />;
// @ts-expect-error finite values require an enum
const invalidReveal = <PasswordBox passwordRevealMode="Visible" />;
// @ts-expect-error incompatible enum
const invalidZoom = <ScrollViewer zoomMode={ScrollMode.Enabled} />;
void [textScrollReactContract, invalidTextOptions, invalidReveal, invalidZoom];

import { ProgressBar, ProgressRing } from "../src/react";
const progressDirect = (
  <>
    <ProgressBar
      value={50}
      showError
      onValueChanged={(e) => console.log(e.value)}
    />
    <ProgressRing isActive isIndeterminate={false} value={75} />
    <Button accessibleName="Working">
      <ProgressRing width={16} height={16} />
    </Button>
  </>
);
// @ts-expect-error direct props only
const progressOptions = <ProgressBar options={{ value: 50 }} />;
// @ts-expect-error progress value is numeric
const progressWrong = <ProgressRing value="50" />;
void [progressDirect, progressOptions, progressWrong];

import { RepeatButton, Viewbox } from "../src/react";
import { Stretch, StretchDirection } from "../src/index";
const nextBasic = (
  <>
    <RepeatButton text="Hold" delay={500} interval={33} />
    <Viewbox
      stretch={Stretch.Uniform}
      stretchDirection={StretchDirection.DownOnly}
    >
      <TextBlock text="Scale" />
    </Viewbox>
  </>
);
// @ts-expect-error no options object on public React controls
const nextOptions = <RepeatButton options={{ text: "Hold" }} />;
// @ts-expect-error enum is required
const nextDirection = <Viewbox stretchDirection="Both" />;
void [nextBasic, nextOptions, nextDirection];

import {
  Border,
  Canvas,
  HyperlinkButton,
  Expander,
  InfoBadge,
} from "../src/react";
import {
  ExpandDirection,
  InfoBadgeStyle,
  HorizontalAlignment,
} from "../src/index";
const five = (
  <Border borderThickness={[1, 2, 3, 4]}>
    <Canvas>
      <Expander
        header="Details"
        expandDirection={ExpandDirection.Up}
        horizontalContentAlignment={HorizontalAlignment.Stretch}
      >
        <HyperlinkButton text="Link" navigateUri="https://example.com" />
      </Expander>
      <InfoBadge value={5} badgeStyle={InfoBadgeStyle.Success} />
    </Canvas>
  </Border>
);
// @ts-expect-error finite direction requires its enum
const badExpand = <Expander expandDirection="Up" />;
// @ts-expect-error finite palette requires its enum
const badBadge = <InfoBadge badgeStyle="Success" />;
// @ts-expect-error flat props, no options wrapper
const badBorder = <Border options={{ borderThickness: 2 }} />;
void [five, badExpand, badBadge, badBorder];
// @ts-expect-error Canvas has no Grid track definitions
const badCanvas=<Canvas rows={[]}/>;
void badCanvas;

import { FontIcon, SymbolIcon, PathIcon, BitmapIcon, ImageIcon } from '../src/react';
import { Symbol } from '../src/index';
const iconElements = <><FontIcon glyph="A" fontSize={24} /><SymbolIcon symbol={Symbol.Accept} /><PathIcon data="M0 0L10 10Z" /><BitmapIcon uriSource="sample.png" showAsMonochrome /><ImageIcon source="sample.svg" /></>;
// @ts-expect-error Symbol is a closed runtime enum
const badSymbol = <SymbolIcon symbol="Accept" />;
// @ts-expect-error incompatible enum
const wrongSymbol = <SymbolIcon symbol={InfoBadgeStyle.Success} />;
// @ts-expect-error no options wrapper
const wrappedIcon = <FontIcon options={{ glyph: 'A' }} />;
void [iconElements, badSymbol, wrongSymbol, wrappedIcon];

import {AnimatedIcon,IconSourceElement,Rectangle,Line,Path,Polygon,Polyline} from '../src/react';
import {AnimatedIconSource,IconSourceKind,FlowDirection,FillRule,PenLineCap,PenLineJoin} from '../src/index';
const vectors=<><AnimatedIcon source={AnimatedIconSource.Find} state="PointerOver" fallbackIconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Find}}/><IconSourceElement iconSource={{kind:IconSourceKind.Font,glyph:'A'}}/><FontIcon flowDirection={FlowDirection.RightToLeft}/><Rectangle radiusX={8}/><Line strokeStartLineCap={PenLineCap.Round}/><Path data="F1 M0 0Z"/><Polygon points={[[0,0],[20,20]]} strokeLineJoin={PenLineJoin.Bevel}/><Polyline points={[]}/></>;
// @ts-expect-error finite source requires runtime enum
const badAnimated=<AnimatedIcon source="Find"/>;
// @ts-expect-error source discriminant requires runtime enum
const badSource=<IconSourceElement iconSource={{kind:'Font',glyph:'A'}}/>;
// @ts-expect-error native IconSourceElement supports four source kinds, excluding Image
const unsupportedSource=<IconSourceElement iconSource={{kind:IconSourceKind.Image,source:'a.svg'}}/>;
// @ts-expect-error fill rule is closed
const badRule=<Polygon fillRule="Nonzero"/>;
// @ts-expect-error incompatible enum
const badCap=<Line strokeEndLineCap={PenLineJoin.Round}/>;
// @ts-expect-error flat public React API
const wrappedShape=<Rectangle options={{width:20}}/>;
void [vectors,badAnimated,badSource,unsupportedSource,badRule,badCap,wrappedShape];

import {Popup,ToolTip,Flyout,MenuFlyout,Slider as FloatingSlider} from '../src/react';
import {OverlayPlacement,MenuEntryKind} from '../src/index';
const floatingElements=<><Popup isOpen><TextBlock text="Hello"/></Popup><ToolTip text="Help" placement={OverlayPlacement.Top}/><Flyout placement={OverlayPlacement.Bottom}/><MenuFlyout menuItems={[{id:'open',kind:MenuEntryKind.Command}]}/><FloatingSlider value={50}/></>;
// @ts-expect-error closed placement values require the public enum
const wrongPlacement=<Flyout placement="Top"/>;
// @ts-expect-error flat props; no options wrapper
const wrappedSlider=<FloatingSlider options={{value:5}}/>;
void [floatingElements,wrongPlacement,wrappedSlider];

import {ListView,GridView,ItemsStackPanel,ItemsWrapGrid,VariableSizedWrapGrid} from '../src/react';
import {ListViewSelectionMode,NodeKind,Orientation} from '../src/index';
const collectionElements=<><ListView items={[{id:'one',text:'One',company:'Microsoft'}]} selectionMode={ListViewSelectionMode.Extended} renderItem={item=><TextBlock text={item.company}/>}/><GridView items={['One']} itemsPanel={NodeKind.ItemsWrapGrid}/><ItemsStackPanel orientation={Orientation.Vertical}/><ItemsWrapGrid maximumRowsOrColumns={3}/><VariableSizedWrapGrid itemWidth={44}/></>;
// @ts-expect-error selection uses the exported enum
const badCollectionMode=<ListView selectionMode="Single"/>;
// @ts-expect-error unrelated enum
const wrongCollectionMode=<ListView selectionMode={ThemeMode.Dark}/>;
// @ts-expect-error only the two virtualizing strategies are supported
const badCollectionPanel=<GridView itemsPanel={NodeKind.Grid}/>;
// @ts-expect-error template is inferred from business data
const badCollectionTemplate=<ListView items={[{id:'x',company:'a'}]} renderItem={item=><TextBlock text={item.missing}/>}/>;
// @ts-expect-error flat API
const wrappedCollection=<ListView options={{items:['One']}}/>;
void [collectionElements,badCollectionMode,wrongCollectionMode,badCollectionPanel,badCollectionTemplate,wrappedCollection];

import {TextTrimming,OpticalMarginAlignment} from '../src/index';
const styledCollection=<GridView items={['One']} itemContainerStyle={{margin:[5,5,5,5],minWidth:100,horizontalContentAlignment:HorizontalAlignment.Stretch}} renderItem={item=><TextBlock text={item} trimming={TextTrimming.WordEllipsis}/>}/>;
// @ts-expect-error container alignment requires its public runtime enum
const badContainerStyle=<GridView itemContainerStyle={{horizontalContentAlignment:'Stretch'}}/>;
// @ts-expect-error trimming requires its public runtime enum
const badWordTrimming=<TextBlock trimming="WordEllipsis"/>;
const opticalTitle=<TextBlock text="Title" opticalMarginAlignment={OpticalMarginAlignment.TrimSideBearings}/>;
// @ts-expect-error optical margin alignment is a closed runtime enum
const badOpticalTitle=<TextBlock opticalMarginAlignment="TrimSideBearings"/>;
void [styledCollection,badContainerStyle,badWordTrimming,opticalTitle,badOpticalTitle];

import {SplitView,SemanticZoom,ParallaxView,UICommand,StandardCommand,ScrollView,SwipeControl} from '../src/react';
import {SplitViewDisplayMode,StandardCommandKind,SwipeMode} from '../src/index';
const viewCommandElements=<><UICommand label="Custom XamlUICommand" onExecuteRequested={event=>void event.parameter}/><StandardCommand standardKind={StandardCommandKind.Delete}/><SplitView displayMode={SplitViewDisplayMode.Inline} pane={<TextBlock text="Pane"/>}><TextBlock text="Content"/></SplitView><SemanticZoom zoomedInView={<GridView items={['Detail']}/>} zoomedOutView={<ListView items={['Group']}/>}/><ParallaxView verticalShift={500}/><ScrollView><SwipeControl rightItems={{mode:SwipeMode.Execute,items:[{id:'delete'}]}}><TextBlock text="Item"/></SwipeControl></ScrollView></>;
// @ts-expect-error SwipeMode is a closed runtime enum.
const wrongSwipeMode=<SwipeControl rightItems={{mode:'Execute',items:[{id:'delete'}]}}/>;
// @ts-expect-error Command kind cannot use another enum.
const wrongStandardKind=<StandardCommand standardKind={SplitViewDisplayMode.Inline}/>;
// @ts-expect-error Commands use flat props.
const wrappedCommand=<UICommand options={{label:'Command'}}/>;
void [viewCommandElements,wrongSwipeMode,wrongStandardKind,wrappedCommand];

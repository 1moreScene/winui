import { useState, type ReactNode } from 'react';
import {
  ContentDialogButton, HorizontalAlignment, ListViewSelectionMode, RendererBackend,
  type ComboBoxController, type ComposedEvent, type ContentDialogController, type Scene,
} from 'winui-wasm';
import { ComboBox, ContentDialog, Rectangle, SceneView, StackPanel, TextBlock, TreeComboBox } from 'winui-wasm/react';
import { GalleryButton, GalleryComboBox, GalleryExpander, GalleryExpanderHeader, GalleryOption } from './GalleryControls';
import { LocalizedText } from './GalleryLanguage';
import { SourceCode } from './SourceCode';
import { useGalleryTheme } from './gallery-theme';
import { extractSampleSource } from './sample-source';
import official from './official-composed-controls.json';
import pageSource from './ComboBoxPage.tsx?raw';
import nativePage from '../../references/gallery-input/ComboBox/ComboBoxPage.xaml?raw';
import nativeCode from '../../references/gallery-input/ComboBox/ComboBoxPage.xaml.cs?raw';

const colors = [
  { id: 'Blue', text: 'Blue', fill: '#0000ff' },
  { id: 'Green', text: 'Green', fill: '#008000' },
  { id: 'Red', text: 'Red', fill: '#ff0000' },
  { id: 'Yellow', text: 'Yellow', fill: '#ffff00' },
];
const fonts = ['Arial', 'Comic Sans MS', 'Courier New', 'Segoe UI', 'Times New Roman']
  .map(name => ({ id: name, text: name }));
const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72'];
const folders = [
  { id: 'documents', text: 'Documents', isExpanded: true, children: [
    { id: 'reports', text: 'Reports' },
    { id: 'notes', text: 'Notes' },
  ] },
  { id: 'pictures', text: 'Pictures', children: [
    { id: 'screenshots', text: 'Screenshots' },
    { id: 'wallpapers', text: 'Wallpapers' },
  ] },
];
const largeSource = Array.from({ length: 10_000 }, (_, index) => ({
  id: String(index + 1),
  text: `Item ${index + 1}`,
}));
const nativeSamples = [...nativePage.matchAll(/<controls:ControlExample.Example>\s*([\s\S]*?)\s*<\/controls:ControlExample.Example>/g)]
  .map(([, xaml]) => xaml.replace(/^ {16}/gm, '').trim());

function remember(name: string, scene: Scene) {
  window.composedScenes ??= {};
  window.composedScenes[name] = scene;
}

function Example({ name, title, nativeIndex, children }: {
  name: string;
  title: string;
  nativeIndex?: number;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<'tsx' | 'xaml' | 'csharp'>('tsx');
  return <section id={name} className="example basic-example">
    <h2><LocalizedText>{title}</LocalizedText></h2>
    <div className="example-card">
      <div className="basic-live"><div className="basic-preview">{children}</div></div>
      <GalleryExpander className="source">
        <GalleryExpanderHeader>Source code</GalleryExpanderHeader>
        {nativeIndex !== undefined && <div className="source-tabs">
          <GalleryButton className={language === 'tsx' ? 'active' : ''} onClick={() => setLanguage('tsx')}>TypeScript / React</GalleryButton>
          <GalleryButton className={language === 'xaml' ? 'active' : ''} onClick={() => setLanguage('xaml')}>Official XAML</GalleryButton>
          <GalleryButton className={language === 'csharp' ? 'active' : ''} onClick={() => setLanguage('csharp')}>Official C#</GalleryButton>
        </div>}
        <SourceCode language={language}>{language === 'xaml' && nativeIndex !== undefined
          ? nativeSamples[nativeIndex]
          : language === 'csharp' ? nativeCode : extractSampleSource(pageSource, name)}</SourceCode>
      </GalleryExpander>
    </div>
  </section>;
}

export function ComboBoxPage() {
  const [theme] = useGalleryTheme();
  const [backend, setBackend] = useState(RendererBackend.Canvas2D);
  const [fill, setFill] = useState('#00000000');
  const [font, setFont] = useState(fonts[2].id);
  const [fontSize, setFontSize] = useState(fontSizes[2]);
  const [fontSizeDialog, setFontSizeDialog] = useState<ContentDialogController | null>(null);
  const shared = { theme, backend, autoHeight: true };
  const samples = official.controls.ComboBox.samples;

  function submitFontSize(event: ComposedEvent<string>) {
    event.handled = true;
    const combo = event.target as ComboBoxController<string>;
    const input = event.text?.trim() ?? '';
    const size = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(input) ? Number(input) : NaN;
    const value = String(size);
    if (fontSizes.includes(value) || (size > 8 && size < 100)) {
      setFontSize(value);
      combo.update({ selectedIndex: fontSizes.indexOf(value), text: value, isDropDownOpen: false });
    } else {
      combo.update({ text: fontSize, isDropDownOpen: false });
      void fontSizeDialog?.showAsync();
    }
  }

  return <main className="stage-main official-motion">
    <div className="effects-options">
      <label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={value => setBackend(value as RendererBackend)}>
        {Object.values(RendererBackend).map(value => <GalleryOption key={value}>{value}</GalleryOption>)}
      </GalleryComboBox></label>
    </div>
    <Example name="composed-combo" title={samples[0].title} nativeIndex={0}>
      <SceneView {...shared} onReady={scene => remember('ComboBox', scene)}>
        {/* @sample:composed-combo:start */}
        <StackPanel horizontalAlignment={HorizontalAlignment.Left}>
          <ComboBox width={200} header="Colors" placeholderText="Pick a color" items={colors}
            onSelectionChanged={event => setFill(event.selectedItem?.fill ?? '#00000000')} />
          <Rectangle width={100} height={30} margin={[0, 8, 0, 0]} fill={fill} />
        </StackPanel>
        {/* @sample:composed-combo:end */}
      </SceneView>
    </Example>
    <Example name="composed-combo-source" title={samples[1].title} nativeIndex={1}>
      <SceneView {...shared} onReady={scene => remember('ComboBoxFonts', scene)}>
        {/* @sample:composed-combo-source:start */}
        <StackPanel horizontalAlignment={HorizontalAlignment.Left}>
          <ComboBox minWidth={200} header="Font" items={fonts} selectedIndex={2}
            renderItem={item => <TextBlock text={item.text} />}
            onSelectionChanged={event => setFont(event.selectedItem?.id ?? fonts[2].id)} />
          <TextBlock margin={[8, 8, 0, 0]} fontFamily={font} text="You can set the font used for this text." />
        </StackPanel>
        {/* @sample:composed-combo-source:end */}
      </SceneView>
    </Example>
    <Example name="composed-combo-edit" title={samples[2].title} nativeIndex={2}>
      <SceneView {...shared} onReady={scene => remember('ComboBoxEditable', scene)}>
        {/* @sample:composed-combo-edit:start */}
        <StackPanel horizontalAlignment={HorizontalAlignment.Left}>
          <ComboBox width={200} header="Font Size" items={fontSizes} selectedIndex={fontSizes.indexOf(fontSize)}
            isEditable onSelectionChanged={event => { if (event.selectedItem !== undefined) setFontSize(event.selectedItem); }}
            onTextSubmitted={submitFontSize} />
          <TextBlock margin={[8, 8, 0, 0]} fontFamily="Segoe UI" fontSize={Number(fontSize)}
            text="You can set the font size used for this text." />
        </StackPanel>
        <ContentDialog closeButtonText="Close" defaultButton={ContentDialogButton.Close} onReady={setFontSizeDialog}>
          <TextBlock text="The font size must be a number between 8 and 100." wrap />
        </ContentDialog>
        {/* @sample:composed-combo-edit:end */}
      </SceneView>
    </Example>
    <h2><LocalizedText>ComboBox extensions</LocalizedText></h2>
    <Example name="combo-clearable" title="Clearable ComboBox">
      <SceneView {...shared}>
        {/* @sample:combo-clearable:start */}
        <ComboBox width={240} header="Accent color" items={colors} selectedIndex={0}
          placeholderText="Pick a color" clearable />
        {/* @sample:combo-clearable:end */}
      </SceneView>
    </Example>
    <Example name="combo-tree" title="Tree ComboBox">
      <SceneView {...shared}>
        {/* @sample:combo-tree:start */}
        <StackPanel spacing={12} horizontalAlignment={HorizontalAlignment.Left}>
          <TreeComboBox width={240} header="Folder" items={folders} placeholderText="Choose a folder" clearable />
          <TreeComboBox width={240} header="Folders" items={folders} placeholderText="Choose folders" clearable
            selectionMode={ListViewSelectionMode.Multiple} />
        </StackPanel>
        {/* @sample:combo-tree:end */}
      </SceneView>
    </Example>
    <Example name="combo-multiple" title="Multi-select ComboBox">
      <SceneView {...shared}>
        {/* @sample:combo-multiple:start */}
        <ComboBox width={240} header="Colors" accessibleName="Choose multiple colors" items={colors}
          placeholderText="Choose colors" clearable selectionMode={ListViewSelectionMode.Multiple} />
        {/* @sample:combo-multiple:end */}
      </SceneView>
    </Example>
    <Example name="combo-virtualized" title="Virtualized ComboBox with 10,000 items">
      <SceneView {...shared} onReady={scene => remember('ComboBoxVirtualized', scene)}>
        {/* @sample:combo-virtualized:start */}
        <ComboBox width={240} header="Items" items={largeSource} selectedKeys={['10000']}
          maxDropDownHeight={288} clearable selectionMode={ListViewSelectionMode.Multiple} />
        {/* @sample:combo-virtualized:end */}
      </SceneView>
    </Example>
  </main>;
}

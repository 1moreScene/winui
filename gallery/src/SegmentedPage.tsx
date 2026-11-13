import {useState, type ReactNode} from 'react';
import {SceneView, Segmented, SegmentedItem, StackPanel, TextBlock} from 'winui-wasm/react';
import {ListViewSelectionMode, Orientation, SegmentedStyle} from 'winui-wasm';
import {useGalleryTheme} from './gallery-theme';
import {GalleryExpander, GalleryExpanderHeader} from './GalleryControls';
import {SourceCode} from './SourceCode';
import {extractSampleSource} from './sample-source';
import source from './SegmentedPage.tsx?raw';

function Example({id, title, children}: {id:string; title:string; children:ReactNode}) {
  return <section id={id} className="example basic-example">
    <h2>{title}</h2>
    <div className="example-card">
      <div className="basic-live"><div className="basic-preview">{children}</div></div>
      <GalleryExpander className="source">
        <GalleryExpanderHeader>Source code</GalleryExpanderHeader>
        <SourceCode language="tsx">{extractSampleSource(source, id)}</SourceCode>
      </GalleryExpander>
    </div>
  </section>;
}

export function SegmentedPage() {
  const [theme] = useGalleryTheme();
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState(0);
  return <main className="control-page">
    <Example id="segmented-basic" title="Basic Segmented">
      <SceneView autoHeight theme={theme}>
        <StackPanel orientation={Orientation.Vertical} spacing={12}>
          {/* @sample:segmented-basic:start */}
          <Segmented accessibleName="Calendar view" selectedIndex={selected}
            onSelectionChanged={e => setSelected(e.selectedIndex ?? -1)}>
            <SegmentedItem content="Day" icon={'\uE8BF'}/>
            <SegmentedItem content="Week" icon={'\uE8C0'}/>
            <SegmentedItem content="Month" icon={'\uE787'}/>
          </Segmented>
          <TextBlock text={`Selected index: ${selected}`}/>
          <Segmented accessibleName="Icon-only calendar" selectedIndex={2}>
            <SegmentedItem accessibleName="Day view" icon={'\uE8BF'}/>
            <SegmentedItem accessibleName="Week view" icon={'\uE8C0'}/>
            <SegmentedItem accessibleName="Month view" icon={'\uE787'}/>
          </Segmented>
          {/* @sample:segmented-basic:end */}
        </StackPanel>
      </SceneView>
    </Example>
    <Example id="segmented-styles" title="Styles and selection">
      <SceneView autoHeight theme={theme}>
        {/* @sample:segmented-styles:start */}
        <StackPanel orientation={Orientation.Vertical} spacing={16}>
          <TextBlock text="ButtonSegmentedStyle" fontWeight={600}/>
          <Segmented accessibleName="Button calendar" segmentedStyle={SegmentedStyle.Button}
            selectedIndex={0} selectionMode={ListViewSelectionMode.Multiple}>
            <SegmentedItem content="Day" icon={'\uE8BF'}/>
            <SegmentedItem content="Week" icon={'\uE8C0'}/>
            <SegmentedItem content="Month" icon={'\uE787'}/>
          </Segmented>
          <TextBlock text="PivotSegmentedStyle" fontWeight={600}/>
          <Segmented accessibleName="Sections" segmentedStyle={SegmentedStyle.Pivot} selectedIndex={0}>
            <SegmentedItem>Overview</SegmentedItem>
            <SegmentedItem><TextBlock text="Details"/></SegmentedItem>
            <SegmentedItem>History</SegmentedItem>
          </Segmented>
          <TextBlock text="Vertical" fontWeight={600}/>
          <Segmented accessibleName="Vertical calendar" orientation={Orientation.Vertical} selectedIndex={0}>
            <SegmentedItem content="Day" icon={'\uE8BF'}/>
            <SegmentedItem content="Week" icon={'\uE8C0'} enabled={false}/>
            <SegmentedItem content="Month" icon={'\uE787'}/>
          </Segmented>
        </StackPanel>
        {/* @sample:segmented-styles:end */}
      </SceneView>
    </Example>
    <Example id="segmented-source" title="Switch content from a data source">
      <SceneView autoHeight theme={theme}>
        {/* @sample:segmented-source:start */}
        <StackPanel orientation={Orientation.Vertical} spacing={12}>
          <Segmented accessibleName="Display mode" itemsSource={['List', 'Cards']}
            selectedIndex={view} onSelectionChanged={e => setView(e.selectedIndex ?? 0)}/>
          <TextBlock text={view === 0 ? 'List view' : 'Card view'}/>
        </StackPanel>
        {/* @sample:segmented-source:end */}
      </SceneView>
    </Example>
  </main>;
}

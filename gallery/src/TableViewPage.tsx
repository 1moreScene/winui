import { LocalizedText } from "./GalleryLanguage";
import {useMemo,useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryCheckBox,GalleryComboBox,GalleryExpander,GalleryExpanderHeader,GalleryOption} from './GalleryControls';
import {SceneView,Grid,TableView,TextBlock,StackPanel,InfoBadge,TextBox,Button,type ReactTableViewColumn} from 'winui-wasm/react';
import {TableViewGroupState as GroupState,TableViewGroupSortMode as GroupSort,EventKind,RendererBackend,GridUnit,Orientation,VerticalAlignment,TableViewColumnKind as Column,TableViewSelectionUnit as Unit,TableViewGridLinesVisibility as Lines,TableViewRowDetailsVisibilityMode as Details,TableViewCornerButtonMode as Corner,TableViewSortDirection as Direction,ListViewSelectionMode as SelectionMode,ThemeMode,type Scene,type TableViewController as Controller,type TableViewEvent} from 'winui-wasm';
import {extractSampleSource} from './sample-source';
import {SourceCode} from './SourceCode';
import source from './TableViewPage.tsx?raw';
import nativeRows from './table-view-fixture.json';

interface Person {id:string;name:string;age:number;active:boolean;notifications:boolean;department:string;joined:string;start:number;website:string;notes:string;}
const departments=['Engineering','Design','Operations','Research'];
function people(count=24):Person[]{return Array.from({length:count},(_,i)=>({id:`person-${i}`,name:['Adele Vance','Alex Wilber','Megan Bowen','Diego Siciliani','李明','王芳'][i%6]+(i<6?'':` ${i+1}`),age:22+i%37,active:i%3!==0,notifications:i%2===0,department:departments[i%4],joined:`2024-${String(i%12+1).padStart(2,'0')}-${String(i%27+1).padStart(2,'0')}`,start:480+(i%5)*30,website:`https://example.com/people/${i+1}`,notes:`Employee ${i+1} · Stable identity survives sorting, filtering and scrolling.`}));}
const rows=people();
const compact:ReactTableViewColumn<Person>[]=[{field:'name',header:'Name',width:190},{field:'department',header:'Department',width:150},{field:'age',header:'Age',kind:Column.Number,width:90},{field:'active',header:'Active',kind:Column.CheckBox,width:100}];
const allColumns:ReactTableViewColumn<Person>[]=[
 {field:'name',header:'Name',width:180},
 {field:'age',header:'Age',kind:Column.Number,width:90,cellStyle:item=>item.age>=50?{foreground:'#C42B1C'}:{}},
 {field:'active',header:'Active',kind:Column.CheckBox,width:95},
 {field:'notifications',header:'Notifications',kind:Column.ToggleSwitch,width:150},
 {field:'department',header:'Department',kind:Column.ComboBox,options:departments,width:150},
 {field:'joined',header:'Joined',kind:Column.Date,width:145},
 {field:'start',header:'Start time',kind:Column.Time,format:v=>`${String(Math.floor(Number(v)/60)).padStart(2,'0')}:${String(Number(v)%60).padStart(2,'0')}`,width:170},
 {field:'website',header:'Website',kind:Column.Hyperlink,width:240,isReadOnly:true},
 {field:'notes',header:'Notes',kind:Column.Template,width:300,renderCell:item=><TextBlock text={item.notes} verticalAlignment={VerticalAlignment.Center}/>,renderEditor:(item,ctx)=><StackPanel orientation={Orientation.Horizontal} spacing={6}><TextBox text={item.notes} width={170} onTextChanged={e=>{drafts.set(item.id,e.text??'');}}/><Button text="Save" onClick={()=>ctx.commit(drafts.get(item.id)??item.notes)}/><Button text="Cancel" onClick={ctx.cancel}/></StackPanel>},
];
const drafts=new Map<string,string>();
declare global{interface Window{tableViewScenes:Record<string,Scene>;tableViewControls:Record<string,Controller<Person>>;}}
function Example({name,title,children,options}:{name:string;title:string;children:ReactNode;options?:ReactNode}){return <section className="example basic-example" id={name}><h2><LocalizedText>{title}</LocalizedText></h2><div className="example-card"><div className={`basic-live${options?' with-options':''}`}><div className="basic-preview" style={{minWidth:0,width:'100%'}}>{children}</div>{options&&<div className="options">{options}</div>}</div><GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><SourceCode>{extractSampleSource(source,name)}</SourceCode></GalleryExpander></div></section>;}
function remember(name:string){return (scene:Scene)=>{window.tableViewScenes??={};window.tableViewScenes[name]=scene;};}
function control(name:string){return (table:Controller<Person>)=>{window.tableViewControls??={};window.tableViewControls[name]=table;};}
type NativeRow=typeof nativeRows[number];
declare global {interface Window {tableViewParity?:{scene?:Scene;table?:Controller<NativeRow>};}}
function NativeComparison({theme,backend}:{theme:ThemeMode;backend:RendererBackend}){
 const table=useRef<Controller<NativeRow>|null>(null),[reference,setReference]=useState('default');
 const show=(state:string)=>{const t=table.current;if(!t||t.isDisposed)return;t.cancelEdit();t.clearSorting();t.clearSelection();if(state==='cell-selected')t.select({row:'r1',column:'firstName'});if(state==='row-selected')t.select({row:'r2',column:'firstName'},true);if(state==='editing')t.beginEdit({row:'r0',column:'firstName'});if(state==='sorted')t.sort('firstName',Direction.Ascending);setReference(state);};
 return <Example name="table-native" title="Community SampleApp comparison — identical data and dimensions">
  <p><LocalizedText>800 × 320 DIP · Segoe UI 14 · native capture at 125%. These references come from the pinned community SampleApp with an English fixture and matching accent colors.</LocalizedText></p>
  <div className="toolbar">{[['default','Default'],['cell-selected','Cell selection'],['row-selected','Row selection'],['editing','Editing'],['sorted','Sorting']].map(([value,label])=><GalleryButton key={value} onClick={()=>show(value)}>{label}</GalleryButton>)}</div>
  <div style={{overflowX:'auto'}}><div style={{width:800}}>
   <p><LocalizedText>Rust SDK</LocalizedText></p><div id="table-native-runtime"><SceneView theme={theme} backend={backend} style={{height:320,width:800,background:theme===ThemeMode.Light?'#F3F3F3':'#202020'}} onReady={scene=>{window.tableViewParity??={};window.tableViewParity.scene=scene;}}>
   {/* @sample:table-native:start */}
   <Grid width={800} height={320} background={theme===ThemeMode.Light?'#F3F3F3':theme===ThemeMode.Dark?'#202020':'#000000'}><TableView items={nativeRows} width={800} height={320} autoGenerateColumns={false}
    columns={[{field:'firstName',header:'First Name',width:160},{field:'lastName',header:'Last Name',width:160},{field:'department',header:'Department',width:180},{field:'active',header:'Active',kind:Column.CheckBox,width:110}]}
    onReady={node=>{table.current=node;window.tableViewParity??={};window.tableViewParity.table=node;}}/></Grid>
   {/* @sample:table-native:end */}
   </SceneView></div>
   <p><LocalizedText>Native community SampleApp · static reference</LocalizedText></p>{theme===ThemeMode.HighContrast?<p><LocalizedText>A matching native high contrast capture has not been made.</LocalizedText></p>:<img src={`/community-table-view/${theme}-${reference}.png`} width={800} height={320} alt={`Native community TableView ${theme} ${reference}`}/>}
  </div></div>
  <p><LocalizedText>Black native focus/current-cell borders are suppressed in this SDK by the project's explicit focus policy. Physical input, popup material and animation parity are tracked separately from these static references.</LocalizedText></p>
 </Example>;
}
function GroupingExample({theme,backend}:{theme:ThemeMode;backend:RendererBackend}){
 const ref=useRef<Controller<Person>|null>(null),[multi,setMulti]=useState(false),[sticky,setSticky]=useState(true),[custom,setCustom]=useState(false),[many,setMany]=useState(false),[status,setStatus]=useState('');
 const items=useMemo(()=>people(many?10000:24),[many]);
 return <Example name="table-grouping" title="Column grouping — multiple levels, sticky headers and custom templates">
 <p><a href="https://github.com/w-ahmad/WinUI.TableView/tree/6de5f1cf388747e7ed046d5180815ca28c59f525" target="_blank" rel="noreferrer">Community 1.5.1 release</a> · <a href="/licenses/WinUI.TableView/v1.5.1/LICENSE.md" target="_blank" rel="noreferrer">MIT license</a> · open a column menu to group, ungroup or sort groups by count. Grouping, expansion and virtualized headers run in Rust.</p>
 <div className="toolbar"><GalleryCheckBox label="Group by Department then Active" checked={multi} onValueChanged={setMulti}/><GalleryCheckBox label="Sticky group headers" checked={sticky} onValueChanged={setSticky}/><GalleryCheckBox label="Custom group header" checked={custom} onValueChanged={setCustom}/><GalleryCheckBox label="10,000 grouped rows" checked={many} onValueChanged={setMany}/></div>
 <div className="toolbar"><GalleryButton onClick={()=>ref.current?.expandAllGroups()}>Expand all groups</GalleryButton><GalleryButton onClick={()=>ref.current?.collapseAllGroups()}>Collapse all groups</GalleryButton><GalleryButton onClick={()=>ref.current?.sortGroups('department',GroupSort.Count,Direction.Descending)}>Order groups by count</GalleryButton><GalleryButton onClick={()=>ref.current?.sortGroups('department',GroupSort.Key,Direction.Ascending)}>Order groups by key</GalleryButton><GalleryButton onClick={()=>ref.current?.ungroupAll()}>Ungroup all</GalleryButton></div>
 <div id="table-grouping-runtime" style={{overflowX:'auto'}}><SceneView theme={theme} backend={backend} style={{width:776.8,height:360,background:theme===ThemeMode.Light?'#F3F3F3':'#202020'}} onReady={remember('grouping')}>
 {/* @sample:table-grouping:start */}
 <TableView items={items} sorts={[{column:'age',direction:Direction.Ascending}]} groups={multi?['department','active']:['department']}
  columns={[{field:'name',header:'Name',width:180},{field:'department',header:'Department',width:150},{field:'age',header:'Age',kind:Column.Number,width:90},{field:'active',header:'Active',kind:Column.CheckBox,width:95}]}
  width={776.8} height={360} autoGenerateColumns={false} frozenColumnCount={1}
  defaultGroupState={GroupState.Expanded} areStickyGroupHeadersEnabled={sticky}
  renderGroupHeader={custom?g=><Grid columns={[{unit:GridUnit.Star,value:1},{unit:GridUnit.Auto,value:1}]}><TextBlock text={`${g.column}: ${String(g.key)}`} fontSize={18} verticalAlignment={VerticalAlignment.Center}/><TextBlock column={1} text={`${g.count} employees`} fontSize={14} verticalAlignment={VerticalAlignment.Center}/></Grid>:undefined}
  onReady={t=>{ref.current=t;control('grouping')(t);}}
  onGrouping={e=>setStatus(`Grouping ${e.table.column}`)}/>
 {/* @sample:table-grouping:end */}
 </SceneView></div><output>{status}</output>
 <GalleryExpander><GalleryExpanderHeader>Native 1.5.1 release reference · identical data and dimensions</GalleryExpanderHeader>{theme===ThemeMode.HighContrast?<p>A matching native high contrast capture has not been made.</p>:<img src={`/community-table-view/grouping/${theme===ThemeMode.Dark?'Dark':'Light'}-${multi?'multi':'expanded'}.png`} width={776.8} height={360} alt="Native released community TableView grouping reference"/>}</GalleryExpander>
 </Example>;
}
export function TableViewPage(){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D),[data,setData]=useState<readonly Person[]>(rows),[readOnly,setReadOnly]=useState(false),[compactMode,setCompactMode]=useState(false),[unit,setUnit]=useState(Unit.CellOrRow),[grid,setGrid]=useState(Lines.All),[selectionMode,setSelectionMode]=useState(SelectionMode.Extended),[detailsMode,setDetailsMode]=useState(Details.VisibleWhenSelected),[detailsFrozen,setDetailsFrozen]=useState(false),[frozen,setFrozen]=useState(1),[search,setSearch]=useState(''),[output,setOutput]=useState('Double-click a cell or press F2 to edit.'),[csv,setCsv]=useState(''),[page,setPage]=useState(0),[largeMode,setLargeMode]=useState(false);
 const large=useMemo(()=>people(10000),[]),editor=useRef<Controller<Person>|null>(null),shaping=useRef<Controller<Person>|null>(null),selection=useRef<Controller<Person>|null>(null),exporter=useRef<Controller<Person>|null>(null);
 const shared={theme,backend};const event=(e:TableViewEvent<Person>)=>{if(e.kind===EventKind.RealizationChanged)return;setOutput(e.table?.error??`${e.kind}${e.table?.cell?` · ${e.table.cell.row} / ${e.table.cell.column}`:''}`);};
 return <><Header title="TableView" theme={theme} onTheme={setTheme}/><p className="description"><LocalizedText>Community WinUI.TableView · Rust data grid with native SDK cells, editors, menus and scrollbars. Based on <a href="https://github.com/w-ahmad/WinUI.TableView/tree/665fea52b8ad47a64187d0f202d5281b074f616f" target="_blank" rel="noreferrer">w-ahmad/WinUI.TableView</a> · <a href="/licenses/WinUI.TableView/LICENSE.md" target="_blank" rel="noreferrer">MIT license</a>.</LocalizedText></p><div className="toolbar"><GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={v=>setBackend(v as RendererBackend)}>{Object.values(RendererBackend).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox></div>
 <NativeComparison {...shared}/>
 <GroupingExample {...shared}/>
 <Example name="table-auto" title="Automatic columns — the smallest API"><SceneView {...shared} style={{height:280}} onReady={remember('auto')}>
 {/* @sample:table-auto:start */}
 <TableView items={rows.slice(0,6)} height={280} accessibleName="Automatic columns"/>
 {/* @sample:table-auto:end */}
 </SceneView></Example>
 <Example name="table-editing" title="All nine column types and cancellable editing" options={<><GalleryCheckBox checked={readOnly} onValueChanged={setReadOnly} label="Read only"/><GalleryCheckBox checked={compactMode} onValueChanged={setCompactMode} label="Compact rows"/><GalleryButton onClick={()=>editor.current?.commitEdit()}>Commit edit</GalleryButton><GalleryButton onClick={()=>editor.current?.cancelEdit()}>Cancel edit</GalleryButton><output>{output}</output><p><LocalizedText>Double-click or F2 starts editing. Enter commits, Escape cancels. Age values below 18 are rejected by CellEditEnding.</LocalizedText></p></>}><SceneView {...shared} style={{height:360}} onReady={remember('editing')}>
 {/* @sample:table-editing:start */}
 <TableView items={data} columns={allColumns} autoGenerateColumns={false} height={360}
  frozenColumnCount={1} rowHeight={compactMode?32:40} isReadOnly={readOnly}
  gridLinesVisibility={Lines.Horizontal} onReady={t=>{editor.current=t;control('editing')(t);}}
  onItemsChanged={setData} onEvent={event}
  onCellEditEnding={e=>{if(e.table.cell?.column==='age'&&Number(e.table.value)<18&&!e.table.cancelEdit){e.cancel=true;setOutput('Age must be at least 18.');}}}/>
 {/* @sample:table-editing:end */}
 </SceneView></Example>
 <Example name="table-shaping" title="Multi-column sorting, Excel-style filters and external search" options={<><SceneView {...shared} style={{height:40}}><TextBox text={search} placeholderText="Search all columns" accessibleName="Search table" onTextChanged={e=>setSearch(e.text??'')}/></SceneView><GalleryButton onClick={()=>shaping.current?.sort('age',Direction.Descending)}>Age descending</GalleryButton><GalleryButton onClick={()=>shaping.current?.filter({column:'department',values:['Engineering']})}>Engineering only</GalleryButton><GalleryButton onClick={()=>{shaping.current?.clearFilters();shaping.current?.clearSorting();setSearch('');}}>Reset view</GalleryButton><p><LocalizedText>Click a header to sort. Ctrl-click adds a sort. Use the filter arrow to search values, select values and press Ok.</LocalizedText></p></>}><SceneView {...shared} style={{height:320}} onReady={remember('shaping')}>
 {/* @sample:table-shaping:start */}
 <TableView items={rows} columns={compact} autoGenerateColumns={false} search={search} height={320}
  onReady={t=>{shaping.current=t;control('shaping')(t);}}/>
 {/* @sample:table-shaping:end */}
 </SceneView></Example>
 <Example name="table-selection" title="Cell and row selection, keyboard navigation and grid lines" options={<><GalleryComboBox aria-label="Selection unit" value={unit} onValueChanged={v=>setUnit(v as Unit)}>{Object.values(Unit).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryComboBox aria-label="Grid lines" value={grid} onValueChanged={v=>setGrid(v as Lines)}>{Object.values(Lines).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryComboBox aria-label="Selection mode" value={selectionMode} onValueChanged={v=>setSelectionMode(v as SelectionMode)}>{Object.values(SelectionMode).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryButton onClick={()=>selection.current?.selectAll()}>Select all</GalleryButton><GalleryButton onClick={()=>selection.current?.clearSelection()}>Clear selection</GalleryButton><p><LocalizedText>Ctrl-click toggles selection, Shift-click extends a rectangle. Row headers select rows. Arrows, Home/End and PageUp/PageDown navigate.</LocalizedText></p></>}><SceneView {...shared} style={{height:300}} onReady={remember('selection')}>
 {/* @sample:table-selection:start */}
 <TableView items={rows} columns={compact} autoGenerateColumns={false} height={300}
  selectionUnit={unit} selectionMode={selectionMode} gridLinesVisibility={grid} alternateRowBackground={theme===ThemeMode.HighContrast?'#000000':theme===ThemeMode.Dark?'#292929':'#F5F5F5'}
  onReady={t=>{selection.current=t;control('selection')(t);}} onSelectionChanged={event}/>
 {/* @sample:table-selection:end */}
 </SceneView></Example>
 <Example name="table-columns" title="Auto, pixel and star sizing, column reordering and frozen columns" options={<><GalleryComboBox aria-label="Frozen columns" value={frozen} onValueChanged={v=>setFrozen(Number(v))}>{[0,1,2].map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryButton onClick={()=>window.tableViewControls.columns?.resizeColumn('name',240)}>Name width 240</GalleryButton><GalleryButton onClick={()=>window.tableViewControls.columns?.reorderColumn(0,2)}>Move first column</GalleryButton><p><LocalizedText>Drag a header to reorder. Drag its right edge to resize. Scroll horizontally to inspect frozen columns.</LocalizedText></p></>}><SceneView {...shared} style={{height:300}} onReady={remember('columns')}>
 {/* @sample:table-columns:start */}
 <TableView items={rows} autoGenerateColumns={false} height={300} frozenColumnCount={frozen} onReady={control('columns')}
  columns={[{field:'name',header:'Name',width:180},{field:'department',header:'Department',width:{unit:GridUnit.Auto,value:1}},
   {field:'age',header:'Age',kind:Column.Number,width:90},
   {field:'notes',header:'Notes',minWidth:400,width:{unit:GridUnit.Star,value:1}},
   {field:'website',header:'Website',width:260}]}/>
 {/* @sample:table-columns:end */}
 </SceneView></Example>
 <Example name="table-templates" title="Native templates, conditional styles, custom row headers and row details" options={<><GalleryComboBox aria-label="Row details visibility" value={detailsMode} onValueChanged={v=>setDetailsMode(v as Details)}>{Object.values(Details).map(v=><GalleryOption key={v} value={v}>{v}</GalleryOption>)}</GalleryComboBox><GalleryCheckBox label="Freeze row details" checked={detailsFrozen} onValueChanged={setDetailsFrozen}/></>}><SceneView {...shared} style={{height:380}} onReady={remember('templates')}>
 {/* @sample:table-templates:start */}
 <TableView items={data} autoGenerateColumns={false} height={380} onReady={control('templates')}
  rowDetailsVisibilityMode={detailsMode} areRowDetailsFrozen={detailsFrozen} rowDetailsHeight={64} rowHeaderWidth={58}
  renderRowHeader={item=><TextBlock text={item.id.replace('person-','#')} fontWeight={600} verticalAlignment={VerticalAlignment.Center}/>}
  renderRowDetails={item=><StackPanel spacing={4}><TextBlock text={item.notes}/><TextBlock text={`${item.department} · Joined ${item.joined}`} fontSize={12}/></StackPanel>}
  columns={[...compact,{key:'status',header:'Status',kind:Column.Template,width:170,renderHeader:()=> <TextBlock text="● Status" fontWeight={600} verticalAlignment={VerticalAlignment.Center}/>,
   renderCell:item=><StackPanel orientation={Orientation.Horizontal} verticalAlignment={VerticalAlignment.Center} spacing={8}><InfoBadge value={item.age}/><TextBlock text={item.active?'Available':'Away'}/></StackPanel>},
   {field:'age',key:'ageStyle',header:'Conditional style',kind:Column.Number,width:170,cellStyle:item=>item.age>=30?{background:'#DFF6DD',foreground:'#0F6C0F'}:{}}]}/>
 {/* @sample:table-templates:end */}
 </SceneView></Example>
 <Example name="table-clipboard" title="Clipboard bindings, CSV export and source row reordering" options={<><GalleryButton onClick={()=>exporter.current?.copy({includeHeaders:true})}>Copy selected with headers</GalleryButton><GalleryButton onClick={()=>{void exporter.current?.paste('New employee\tResearch\t35\ttrue');}}>Paste sample at current cell</GalleryButton><GalleryButton onClick={()=>{void exporter.current?.exportCsv().then(setCsv);}}>Export CSV preview</GalleryButton><GalleryButton onClick={()=>exporter.current?.reorderRow('person-0',5)}>Move first row to position 6</GalleryButton><output style={{whiteSpace:'pre-wrap',maxHeight:200,overflow:'auto'}}>{csv?csv.slice(0,650):'Select a cell before pasting. Drag row headers to reorder the source.'}</output></>}><SceneView {...shared} style={{height:300}} onReady={remember('clipboard')}>
 {/* @sample:table-clipboard:start */}
 <TableView items={data} columns={compact.map(c=>c.field==='name'?{...c,clipboardValue:(item:Person)=>item.name.toUpperCase()}:c)}
  autoGenerateColumns={false} height={300} canReorderRows showExportOptions cornerButtonMode={Corner.Options}
  cellContextMenu={[{id:"inspect",text:"Inspect cell"},{id:"open",text:"Open record"}]} rowContextMenu={[{id:"details",text:"Show employee details"}]}
  onReady={t=>{exporter.current=t;control('clipboard')(t);}} onItemsChanged={setData} onEvent={event}/>
 {/* @sample:table-clipboard:end */}
 </SceneView></Example>
 <Example name="table-large" title="10,000 rows with viewport realization and optional paging" options={<><GalleryCheckBox checked={largeMode} onValueChanged={setLargeMode} label="Page 100 rows at a time"/><GalleryButton onClick={()=>setPage(Math.max(0,page-1))}>Previous page</GalleryButton><GalleryButton onClick={()=>setPage(Math.min(99,page+1))}>Next page</GalleryButton><GalleryButton onClick={()=>window.tableViewControls.large?.scrollIntoView('person-9999')}>Scroll to row 10,000</GalleryButton><output>{largeMode?`Page ${page+1} / 100`:'10,000 rows · only visible cells have native nodes'}</output></>}><SceneView {...shared} style={{height:360}} onReady={remember('large')}>
 {/* @sample:table-large:start */}
 <TableView items={large} columns={compact} autoGenerateColumns={false} height={360} isReadOnly
  pageSize={largeMode?100:0} pageIndex={largeMode?page:0} onReady={control('large')}/>
 {/* @sample:table-large:end */}
 </SceneView></Example>
 </>;
}

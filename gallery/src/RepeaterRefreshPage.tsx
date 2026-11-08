import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Header} from './ButtonPage';
import {useGalleryTheme} from './gallery-theme';
import {GalleryButton,GalleryComboBox,GalleryOption,GalleryExpander,GalleryExpanderHeader,GalleryRadioButton,GallerySlider} from './GalleryControls';
import {SceneView,StackPanel,ScrollViewer,ItemsRepeater,RefreshContainer,Border,TextBlock,Button,Grid,Ellipse,Rectangle,ListView,Image,TextBox} from './react';
import {StackLayout,UniformGridLayout,FlowLayout,ActivityFeedLayout,VariedImageSizeLayout,FlowLayoutLineAlignment,Orientation,RendererBackend,HorizontalAlignment,VerticalAlignment,ScrollMode,ScrollBarVisibility,GridUnit,ThemeMode,EventKind,type Scene,type RefreshContainer as RefreshControl,type RefreshVisualizer as VisualizerControl,type ItemsRepeater as RepeaterControl,type ScrollViewer as ScrollControl,type SceneEvent} from './index';
import official from './official-repeater-refresh.json';
import {galleryData,galleryColors,createGalleryRecipes} from './repeater-gallery-data';
import pageSource from './RepeaterRefreshPage.tsx?raw';
import {extractSampleSource} from './sample-source';
import './repeater-gallery.css';
type Kind='ItemsRepeater'|'StackLayout'|'UniformGridLayout'|'RefreshContainer'|'RefreshVisualizer';
type RepeaterDebug=Pick<RepeaterControl,'snapshot'|'scrollIntoView'|'focusItem'|'isDisposed'|'items'|'realizedItems'|'properties'>;
type SampleName=Exclude<keyof typeof official,'_repository'>;
const Context=createContext({theme:ThemeMode.Light,backend:RendererBackend.Canvas2D});
const accent={resource:'SystemControlBackgroundAccentBrush'};
const star={unit:GridUnit.Star,value:1};
const centered={horizontalAlignment:HorizontalAlignment.Center,verticalAlignment:VerticalAlignment.Center};
declare global{interface Window{repeaterScenes:Record<string,Scene>;refreshControls:Record<string,RefreshControl|VisualizerControl>;repeaterGalleryViews:Record<string,RepeaterDebug>;}}
function remember(id:string,scene:Scene){window.repeaterScenes??={};window.repeaterScenes[id]=scene;}
function rememberView(id:string,view:RepeaterDebug){window.repeaterGalleryViews??={};window.repeaterGalleryViews[id]=view;}
function palette(key:string){const {theme}=useContext(Context);return (official._repository.palettes[theme]as Record<string,string>)[key]??'#000000';}
function nativeDependencies(source:string){const seen=new Set<string>();let result=source;for(let pass=0;pass<4;pass++){const keys=Array.from(result.matchAll(/\{StaticResource ([^}]+)\}/g),match=>match[1]);let added=false;for(const key of keys){if(seen.has(key))continue;seen.add(key);const resource=(official._repository.resources as Record<string,string>)[key];if(resource&&!result.includes(resource)){result+='\n\n'+resource;added=true;}}if(!added)break;}return result;}
function Example({id,name,children,native}:{id:string;name:SampleName;children:ReactNode;native?:string}){
 const[tab,setTab]=useState(false);const sample=official[name];return <section id={id} className="example basic-example" data-official-sample={name}><h2>{sample.title}</h2><div className="example-card">{children}<GalleryExpander className="source"><GalleryExpanderHeader>Source code</GalleryExpanderHeader><div className="source-tabs"><GalleryButton className={!tab?'active':''} onClick={()=>setTab(false)}>TypeScript / React</GalleryButton><GalleryButton className={tab?'active':''} onClick={()=>setTab(true)}>Official repository</GalleryButton></div><pre><code>{tab?nativeDependencies(native??sample.runtimeXaml):extractSampleSource(pageSource,id)}</code></pre></GalleryExpander></div></section>;
}
function Live({children,options}:{children:ReactNode;options?:ReactNode}){return <div className={`basic-live ${options?'with-options':''}`}><div className="basic-preview repeater-gallery-preview">{children}</div>{options&&<aside className="options repeater-gallery-options">{options}</aside>}</div>;}
function RadioOptions({label,choices,value,onChange}:{label:string;choices:readonly string[];value:number;onChange:(index:number)=>void}){return <div role="group" aria-label={label}><p>{label}</p>{choices.map((choice,index)=><GalleryRadioButton key={choice} horizontalAlignment={HorizontalAlignment.Stretch} label={choice} checked={value===index} onValueChanged={checked=>{if(checked)onChange(index);}}/>)}</div>;}

// @sample:repeater-basic:start
function BasicSample(){
 const shared=useContext(Context),[layout,setLayout]=useState(0),[bars,setBars]=useState(()=>galleryData.bars.map((length,i)=>({id:String(i),length}))),serial=useRef(3);
 const chrome=palette('SystemChromeLowColor');
 const layouts=[new StackLayout({spacing:8}),new StackLayout({orientation:Orientation.Horizontal,spacing:8}),new UniformGridLayout({minColumnSpacing:8,minRowSpacing:8})];
 const keys=['VerticalStackLayout','HorizontalStackLayout','UniformGridLayout'],templates=['HorizontalBarTemplate','VerticalBarTemplate','CircularTemplate'];
 const native=[official.ItemsRepeaterBasicNonInteractiveItems.runtimeXaml.replace('HorizontalBarTemplate',templates[layout]).replace('VerticalStackLayout',keys[layout]),official._repository.resources[keys[layout]as keyof typeof official._repository.resources],official._repository.resources[templates[layout]as keyof typeof official._repository.resources]].join('\n\n');
 return <Example id="repeater-basic" name="ItemsRepeaterBasicNonInteractiveItems" native={native}><Live options={<><GalleryButton minWidth={150} disabled={false} onClick={()=>setBars(items=>[...items,{id:String(serial.current++),length:Math.floor(Math.random()*galleryData.maxLength)}])}>Add Item</GalleryButton><GalleryButton minWidth={150} disabled={!bars.length} onClick={()=>setBars(items=>items.slice(1))}>Remove Item</GalleryButton><RadioOptions label="Layout" choices={['StackLayout - Vertical','StackLayout - Horizontal','UniformGridLayout']} value={layout} onChange={setLayout}/></>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('basic',s)}><ScrollViewer maxHeight={500} horizontalScrollMode={ScrollMode.Auto} horizontalScrollBarVisibility={ScrollBarVisibility.Auto} isVerticalScrollChainingEnabled={false}><ItemsRepeater maxWidth={[437,6000,540][layout]} items={bars} layout={layouts[layout]} onReady={n=>rememberView('basic',n)} renderItem={item=>layout===0?<Border width={425} background={chrome}><Rectangle width={item.length} height={24} fill={accent} horizontalAlignment={HorizontalAlignment.Left}/></Border>:layout===1?<Border height={Math.trunc(425/4)} background={chrome}><Rectangle width={48} height={item.length/4} fill={accent} verticalAlignment={VerticalAlignment.Top}/></Border>:<Grid><Ellipse width={Math.trunc(425/6)} height={Math.trunc(425/6)} background={chrome} {...centered}/><Ellipse width={item.length/6} height={item.length/6} background={accent} {...centered}/></Grid>}/></ScrollViewer></SceneView>
 </Live></Example>;
}
// @sample:repeater-basic:end

// @sample:repeater-virtual:start
function NumberedSample(){
 const shared=useContext(Context),[layout,setLayout]=useState(1);const chrome=palette('SystemControlBackgroundChromeMediumBrush');
 const items=useMemo(()=>Array.from({length:galleryData.numberCount},(_,value)=>({id:String(value),text:String(value),value})),[]);
 const name=layout===0?'UniformGridLayout2':'MyFeedLayout';
 return <Example id="repeater-virtual" name="ItemsRepeaterVirtualizingScrollableListItems" native={official.ItemsRepeaterVirtualizingScrollableListItems.runtimeXaml.replace('MyFeedLayout',name)+'\n\n'+official._repository.resources[name]}><Live options={<RadioOptions label="Layout" choices={['Uniform grid','Custom virtualizing layout']} value={layout} onChange={setLayout}/>}>
 <SceneView {...shared} autoHeight onReady={s=>remember('virtual',s)}><ScrollViewer height={400} padding={[0,0,16,0]} isVerticalScrollChainingEnabled={false}><ItemsRepeater margin={[0,0,12,0]} items={items} layout={layout===0?new UniformGridLayout({minItemWidth:108,minItemHeight:108,minColumnSpacing:12,minRowSpacing:12}):new ActivityFeedLayout({minItemSize:[80,108],columnSpacing:12,rowSpacing:12})} onReady={n=>rememberView('virtual',n)} renderItem={item=><Border background={item.value%2?accent:chrome}><TextBlock text={item.text} {...centered}/></Border>}/></ScrollViewer></SceneView>
 </Live></Example>;
}
// @sample:repeater-virtual:end

// @sample:repeater-flow:start
function FlowSample(){
 const shared=useContext(Context),[orientation,setOrientation]=useState(0),[alignment,setAlignment]=useState(FlowLayoutLineAlignment.Start),[itemSpacing,setItemSpacing]=useState(8),[lineSpacing,setLineSpacing]=useState(8),[realized,setRealized]=useState(0);
 const fill=palette('ControlFillColorDefaultBrush'),stroke=palette('ControlStrokeColorDefaultBrush');
 const items=useMemo(()=>Array.from({length:galleryData.flowCount},(_,i)=>({id:String(i+1),text:`Item ${i+1}`})),[]),control=useRef<RepeaterDebug|null>(null);
 const update=()=>{const view=control.current;if(view&&!view.isDisposed)setRealized(view.realizedItems().length);};
 const native=official.FlowLayoutVirtualization.runtimeXaml.replace('LineAlignment="Start"',`LineAlignment="${alignment}"`).replace('LineSpacing="8"',`LineSpacing="${lineSpacing}"`).replace('MinItemSpacing="8"',`MinItemSpacing="${itemSpacing}"`).replace('<FlowLayout','<FlowLayout Orientation="'+(orientation===0?'Horizontal':'Vertical')+'"');
 return <Example id="repeater-flow" name="FlowLayoutVirtualization" native={native}><Live options={<><RadioOptions label="Orientation" choices={['Horizontal','Vertical']} value={orientation} onChange={setOrientation}/><label>LineAlignment<GalleryComboBox aria-label="Line alignment" value={alignment} onValueChanged={value=>setAlignment(value as FlowLayoutLineAlignment)}>{[FlowLayoutLineAlignment.Start,FlowLayoutLineAlignment.Center,FlowLayoutLineAlignment.SpaceBetween,FlowLayoutLineAlignment.SpaceEvenly].map(v=><GalleryOption key={v} value={v}>{v===FlowLayoutLineAlignment.SpaceBetween?'Space between':v===FlowLayoutLineAlignment.SpaceEvenly?'Space evenly':v}</GalleryOption>)}</GalleryComboBox></label><label>MinItemSpacing<GallerySlider aria-label="Minimum item spacing" min={0} max={32} step={2} value={itemSpacing} onValueChanged={setItemSpacing}/></label><label>LineSpacing<GallerySlider aria-label="Line spacing" min={0} max={32} step={2} value={lineSpacing} onValueChanged={setLineSpacing}/></label></>}>
 <p>Scroll through 500 items. ItemsRepeater creates and recycles only the elements needed near the viewport.</p>
 <SceneView {...shared} autoHeight onReady={s=>remember('flow',s)}><ScrollViewer width={520} height={320} horizontalAlignment={HorizontalAlignment.Left} horizontalScrollMode={orientation===0?ScrollMode.Disabled:ScrollMode.Enabled} horizontalScrollBarVisibility={orientation===0?ScrollBarVisibility.Disabled:ScrollBarVisibility.Auto} verticalScrollMode={orientation===0?ScrollMode.Enabled:ScrollMode.Disabled} verticalScrollBarVisibility={orientation===0?ScrollBarVisibility.Auto:ScrollBarVisibility.Disabled} isHorizontalScrollChainingEnabled={false} isVerticalScrollChainingEnabled={false}><ItemsRepeater items={items} horizontalCacheLength={0} verticalCacheLength={0} layout={new FlowLayout({orientation:orientation===0?Orientation.Horizontal:Orientation.Vertical,lineAlignment:alignment,minItemSpacing:itemSpacing,lineSpacing})} onReady={n=>{control.current=n;rememberView('flow',n);update();}} onElementPrepared={update} onElementClearing={update} renderItem={item=><Border width={96} height={64} background={fill} borderBrush={stroke} borderThickness={[1,1,1,1]} cornerRadius={4}><TextBlock text={item.text} {...centered}/></Border>}/></ScrollViewer></SceneView>
 <output aria-live="polite">Realized elements: {realized} of 500</output>
 </Live></Example>;
}
// @sample:repeater-flow:end

// @sample:repeater-mixed:start
function MixedSample(){
 const shared=useContext(Context),chrome=palette('SystemControlBackgroundChromeMediumBrush'),white=palette('SystemControlForegroundChromeWhiteBrush');
 const items=useMemo(()=>galleryData.mixed.map((value,i)=>({id:String(i),text:String(value),value})),[]);
 return <Example id="repeater-mixed" name="ItemsrepeaterMixedTypeCollection"><Live><p>This is an ItemsRepeater that displays both integer and string items. It uses a DataTemplateSelector to choose the correct layout for each of its items.</p>
 <SceneView {...shared} autoHeight onReady={s=>remember('mixed',s)}><ItemsRepeater margin={[0,0,12,0]} items={items} layout={new UniformGridLayout({minItemWidth:200,minItemHeight:200})} onReady={n=>rememberView('mixed',n)} renderItem={item=><Grid margin={[10,10,10,10]} background={typeof item.value==='string'?accent:chrome}><TextBlock text={item.text} padding={[10,10,10,10]} wrap={typeof item.value==='string'} fontSize={typeof item.value==='number'?46:14} fontWeight={typeof item.value==='number'?300:400} foreground={typeof item.value==='string'?white:undefined} {...centered}/></Grid>}/></SceneView>
 </Live></Example>;
}
// @sample:repeater-mixed:end

// @sample:repeater-nested:start
function NestedSample(){
 const shared=useContext(Context),white=palette('SystemControlForegroundChromeWhiteBrush');const categories=useMemo(()=>galleryData.categories.map(c=>({...c,text:c.id})),[]);
 return <Example id="repeater-nested" name="LayingOutNestedItemsrepeaters"><Live><SceneView {...shared} autoHeight onReady={s=>remember('nested',s)}><ScrollViewer horizontalScrollMode={ScrollMode.Auto} horizontalScrollBarVisibility={ScrollBarVisibility.Auto}><ItemsRepeater items={categories} verticalAlignment={VerticalAlignment.Top} layout={new StackLayout()} onReady={n=>rememberView('nested',n)} renderItem={category=><StackPanel><TextBlock text={category.id} padding={[8,8,8,8]} fontSize={28}/><ItemsRepeater items={category.items} layout={new StackLayout({orientation:Orientation.Horizontal})} renderItem={item=><Grid margin={[10,10,10,10]} background={accent}><TextBlock text={item} padding={[10,10,10,10]} foreground={white} wrap {...centered}/></Grid>}/></StackPanel>}/></ScrollViewer></SceneView></Live></Example>;
}
// @sample:repeater-nested:end

// @sample:repeater-animated:start
function AnimatedSample(){
 const shared=useContext(Context),inverse=palette('TextFillColorInverseBrush'),[color,setColor]=useState<string|null>(null),selected=useRef<string|null>(null);
 const items=useMemo(()=>galleryData.colors.map(text=>({id:text,text})),[]);
 return <Example id="repeater-animated" name="ItemsRepeaterAnimatedScrollingContentDisplay"><Live><SceneView {...shared} autoHeight onReady={s=>remember('animated',s)}><Grid columns={[star,star]}><ScrollViewer width={250} height={175}><ItemsRepeater items={items} isScrollCenterScaleEnabled isFocusCenteringEnabled isKeyboardNavigationEnabled onReady={n=>rememberView('animated',n)} renderItem={item=><Button text={item.text} background={galleryColors[item.text]} foreground={inverse} horizontalAlignment={HorizontalAlignment.Stretch} onClick={()=>{setColor(galleryColors[item.text]);selected.current=item.text;}} accessibleName={item.text+(selected.current===item.text?' , selected':'')}/>}/></ScrollViewer><Rectangle column={1} width={150} height={150} margin={[10,0,0,0]} fill={color} stroke={{resource:'SystemControlForegroundBaseHighBrush'}} strokeThickness={1} accessibleName="ColorRectangle"/></Grid></SceneView></Live></Example>;
}
// @sample:repeater-animated:end

// @sample:repeater-recipes:start
function RecipeSample(){
 const shared=useContext(Context),background=palette('SystemControlBackgroundBaseLowBrush'),inverse=palette('SystemControlForegroundAltHighBrush'),[filter,setFilter]=useState(''),[descending,setDescending]=useState(false),[changed,setChanged]=useState(false);
 const source=useMemo(()=>createGalleryRecipes(),[]);
 const items=useMemo(()=>!changed?source:source.filter(r=>r.ingredients.toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.ingredientList.length-b.ingredientList.length)*(descending?-1:1)),[source,filter,descending,changed]);
 return <Example id="repeater-recipes" name="ItemsRepeaterVirtualizedContentHeavyLayout"><Live><SceneView {...shared} autoHeight onReady={s=>remember('recipes',s)}><Grid height={600} columns={[star,star]}><ScrollViewer><ItemsRepeater items={items} layout={new VariedImageSizeLayout({width:200})} onReady={n=>rememberView('recipes',n)} renderItem={recipe=><Border margin={[5,5,5,5]} borderThickness={[1,1,1,1]} background={background}><StackPanel><StackPanel height={75} margin={[8,8,8,8]} background={recipe.color} opacity={0.8}><TextBlock text={String(recipe.num)} fontSize={35} padding={[12,12,12,12]} foreground={inverse} horizontalAlignment={HorizontalAlignment.Center}/></StackPanel><TextBlock text={recipe.name} margin={[15,0,10,0]} fontSize={28} wrap/><TextBlock text={recipe.ingredients} margin={[15,0,15,15]}/></StackPanel></Border>}/></ScrollViewer><StackPanel column={1} margin={[10,0,0,0]}><TextBox width={200} header="Filter by ingredient..." accessibleName="Filter by ingredient..." margin={[0,0,0,20]} text={filter} onTextChanged={event=>{setFilter(event.text??'');setChanged(true);}}/><TextBlock text="Sort by number of ingredients" margin={[0,0,0,10]}/><Button text="Least to most" margin={[0,0,0,5]} onClick={()=>{if(descending){setDescending(false);setChanged(true);}}}/><Button text="Most to least" onClick={()=>{if(!descending){setDescending(true);setChanged(true);}}}/></StackPanel></Grid></SceneView><span className="repeater-screenreader" aria-live="polite">{changed?`Filtered recipes, ${items.length} results.`:''}</span></Live></Example>;
}
// @sample:repeater-recipes:end

// @sample:refresh-basic:start
function BasicRefreshSample(){
 const shared=useContext(Context),[items,setItems]=useState(()=>galleryData.refreshControls),counter=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const refresh=async()=>{await new Promise<void>(resolve=>setTimeout(resolve,500));if(alive.current)setItems(values=>[`NewControl ${counter.current++}`,...values]);};
 return <Example id="refresh-basic" name="BasicPulltorefresh" native={official.BasicPulltorefresh.runtimeXaml}><Live><SceneView {...shared} autoHeight onReady={s=>remember('refresh',s)}><RefreshContainer horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} onReady={control=>{window.refreshControls??={};window.refreshControls.basic=control;}} onRefresh={refresh}><ListView minWidth={200} height={200} items={items} borderBrush={{resource:'TextControlBorderBrush'}} borderThickness={[1,1,1,1]}/></RefreshContainer></SceneView></Live></Example>;
}
// @sample:refresh-basic:end

// @sample:refresh-custom:start
function CustomRefreshSample(){
 const shared=useContext(Context),[items,setItems]=useState(()=>galleryData.refreshFriends),counter=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const refresh=async()=>{await new Promise<void>(resolve=>setTimeout(resolve,800));if(alive.current)setItems(values=>[`New Friend ${counter.current++}`,...values]);};
 return <Example id="refresh-custom" name="CustomIconPulltorefresh" native={official.CustomIconPulltorefresh.runtimeXaml+'\n\n'+official._repository.pageCodeBehind.PullToRefresh}><Live><SceneView {...shared} autoHeight onReady={s=>remember('refresh-custom',s)}><RefreshContainer horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center} visualizerOptions={{isRotationEnabled:false}} visualizerContent={<Image source={'/official/repeater/'+(shared.theme===ThemeMode.Dark?'SunWhite.png':'SunBlack.png')} width={35} height={35}/>} onReady={control=>{window.refreshControls??={};window.refreshControls.custom=control;}} onRefresh={refresh}><ListView width={200} height={200} items={items} borderBrush={{resource:'TextControlBorderBrush'}} borderThickness={[1,1,1,1]}/></RefreshContainer></SceneView></Live></Example>;
}
// @sample:refresh-custom:end

export function RepeaterRefreshPage({kind}:{kind:Kind}){
 const[theme,setTheme]=useGalleryTheme(),[backend,setBackend]=useState(RendererBackend.Canvas2D);
 const repeaters=['ItemsRepeater','StackLayout','UniformGridLayout'].includes(kind);
 return <Context.Provider value={{theme,backend}}><Header title={repeaters?'ItemsRepeater':'PullToRefresh'} theme={theme} onTheme={setTheme}/><main className="stage-main official-motion"><div className="effects-options"><label>Renderer <GalleryComboBox aria-label="Renderer" value={backend} onValueChanged={value=>setBackend(value as RendererBackend)}>{Object.values(RendererBackend).map(value=><GalleryOption key={value}>{value}</GalleryOption>)}</GalleryComboBox></label></div>{repeaters?<><BasicSample/><NumberedSample/><FlowSample/><MixedSample/><NestedSample/><AnimatedSample/><RecipeSample/></>:<><BasicRefreshSample/><CustomRefreshSample/></>}</main></Context.Provider>;
}

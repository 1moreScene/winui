import {useEffect,useRef,useState} from 'react';
import {SceneView,Grid,StackPanel,TextBlock,Button,Image,GridView,ListView,ItemsRepeater,Border,ScrollViewer,RadioButtons,FontIcon} from 'winui-wasm/react';
import {ConnectedAnimationConfiguration as Configuration,EventKind,GridUnit,HorizontalAlignment as H,VerticalAlignment as V,Orientation,ImageStretch,ListViewSelectionMode,FontStyle,TextTrimming,ThemeTransition,UniformGridLayout,type SceneNode,type Panel,type CollectionView,type ScrollViewerController as ScrollController,OpticalMarginAlignment,type TextOptions} from 'winui-wasm';
import {MotionExample as Example,MotionPreview as Preview,rememberMotion as remember,type MotionShared as Shared} from './MotionExample';
import official from './official-motion.json';
import source from './ConnectedAnimationSamples.tsx?raw';

const items=official.connectedItems;
type Item=typeof items[number];
type Connection=ReturnType<SceneNode['prepareConnectedAnimation']>;
const auto={unit:GridUnit.Auto},star={unit:GridUnit.Star};
function nativeTextStyle(name:keyof typeof official.textStyles):TextOptions{
  const style=official.textStyles[name];return {fontSize:style.fontSize,fontWeight:style.fontWeight,wrap:style.wrap,trimming:TextTrimming[style.trimming as keyof typeof TextTrimming],opticalMarginAlignment:'opticalMarginAlignment' in style?OpticalMarginAlignment.TrimSideBearings:OpticalMarginAlignment.None};
}
const subtitle=nativeTextStyle('SubtitleTextBlockStyle'),subheader=nativeTextStyle('SubheaderTextBlockStyle'),title=nativeTextStyle('TitleTextBlockStyle'),body=nativeTextStyle('BodyTextBlockStyle'),caption=nativeTextStyle('CaptionTextBlockStyle');
const accent={resource:'SystemAccentColor'};
const lorem='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

function Counts({item,detail=false,onReady}:{item:Item;detail?:boolean;onReady?:()=>void}){
  const style=detail?subtitle:caption;
  const count=(label:string,value:string,ready?:()=>void)=><StackPanel orientation={Orientation.Horizontal}><TextBlock text={label} {...style} fontWeight={700}/><TextBlock text={value} {...style} margin={[5,0,0,0]} onReady={ready}/></StackPanel>;
  return <StackPanel orientation={detail?Orientation.Vertical:Orientation.Horizontal} spacing={detail?0:8}>{count('Views: ',item.views)}{count('Likes: ',item.likes,onReady)}</StackPanel>;
}

// @sample:connected-list:start
/** Cached collection content retains Rust scroll offsets while its detail page is shown. */
export function ConnectedCollection({shared,repeater=false}:{shared:Shared;repeater?:boolean}){
  const index=repeater?3:0,key=`connected-${index}`;
  const [selected,setSelected]=useState<Item|null>(null);
  const images=useRef(new Map<string,SceneNode>()),tiles=useRef(new Map<string,Panel>());
  const hero=useRef<SceneNode|undefined>(undefined),pending=useRef<Connection|undefined>(undefined);
  const coordinated=useRef<Panel|undefined>(undefined);
  const list=useRef<CollectionView<Item>|undefined>(undefined),scroll=useRef<ScrollController|undefined>(undefined);
  const offset=useRef(0),lastItem=useRef<Item|undefined>(undefined);
  function navigate(item:Item){
    const image=images.current.get(item.id);if(!image||image.isDisposed)return;
    pending.current=image.prepareConnectedAnimation(key);lastItem.current=item;
    offset.current=repeater?(scroll.current?.snapshot.scroll?.verticalOffset??0):(list.current?.snapshot.scroll?.verticalOffset??0);
    setSelected(item);
  }
  function back(){
    if(!hero.current||hero.current.isDisposed)return;
    pending.current=hero.current.prepareConnectedAnimation(key);setSelected(null);
  }
  useEffect(()=>{
    if(selected||!pending.current||!lastItem.current)return;
    const item=lastItem.current;
    if(repeater)scroll.current?.changeView({verticalOffset:offset.current,disableAnimation:true});
    else list.current?.scrollIntoView(item.id);
    const target=images.current.get(item.id);
    if(target&&!target.isDisposed){pending.current.tryStart(target,Configuration.Direct);pending.current=undefined;}
    if(repeater)tiles.current.get(item.id)?.focus();else list.current?.focus();
  },[selected,repeater]);
  const picture=(item:Item)=><Image source={item.image} stretch={repeater?ImageStretch.UniformToFill:ImageStretch.Fill} minWidth={repeater?undefined:150} maxHeight={repeater?undefined:100} onReady={node=>images.current.set(item.id,node)}/>;
  return <Example name="connected-list" id={`connected-animation-${index}`} kind="ConnectedAnimation" index={index} source={source}>
    <Preview {...shared} onReady={scene=>remember(key,scene)}>
      <StackPanel>
        {repeater&&<TextBlock text="Unlike ListView and GridView, ItemsRepeater does not have built-in ConnectedAnimation methods. Use ConnectedAnimationService.PrepareToAnimate() directly, and manually find the target element in the visual tree. Click an item to navigate with a connected animation." wrap margin={[0,0,0,12]}/>}
        <Grid height={repeater?400:750}>
          <Grid visible={selected===null}>
            {repeater?<ScrollViewer onReady={node=>{scroll.current=node;}}><ItemsRepeater items={items} isKeyboardNavigationEnabled layout={new UniformGridLayout({minItemWidth:150,minItemHeight:120,minColumnSpacing:8,minRowSpacing:8})} renderItem={item=><Grid cornerRadius={4} clip isTabStop accessibleName={item.text} onClick={()=>navigate(item)} onReady={node=>tiles.current.set(item.id,node)}>{picture(item)}<Border verticalAlignment={V.Bottom} padding={[8,4,8,4]} acrylicResource="AcrylicBackgroundFillColorBaseBrush"><TextBlock text={item.text} {...caption}/></Border></Grid>}/></ScrollViewer>:
              <ListView items={items.slice(0,8)} selectionMode={ListViewSelectionMode.None} isItemClickEnabled onItemClick={e=>navigate(e.item)} onReady={node=>{list.current=node;}} renderItem={item=><Grid margin={[0,12,0,12]} accessibleName={item.text} columns={[auto,star]}>{picture(item)}<StackPanel column={1} margin={[12,0,0,0]}><TextBlock text={item.text} {...subtitle} margin={[0,0,0,6]}/><Counts item={item}/><StackPanel orientation={Orientation.Horizontal}><TextBlock text={item.description} {...body} maxWidth={500} maxHeight={40} fontStyle={FontStyle.Italic} margin={[0,8,0,0]} wrap trimming={TextTrimming.CharacterEllipsis}/></StackPanel></StackPanel></Grid>}/>}
          </Grid>
          {selected&&<Grid key="detail" rows={[auto,star]}>
            <Button text="Go Back" horizontalAlignment={H.Left} verticalAlignment={V.Top} onClick={back} onReady={node=>node.focus()}/>
            <Grid margin={[20,52,20,20]} columns={[auto,star]}>
              <Image source={selected.image} maxHeight={400} verticalAlignment={V.Top} stretch={ImageStretch.Uniform} onReady={node=>{hero.current=node;}}/>
              <StackPanel column={1} margin={[20,0,20,0]} verticalAlignment={V.Top} onReady={node=>{coordinated.current=node;}}><TextBlock text={selected.text} {...subheader} margin={[0,0,0,10]}/><Counts item={selected} detail onReady={()=>{if(hero.current&&!hero.current.isDisposed&&coordinated.current){pending.current?.tryStart(hero.current,Configuration.Gravity,[coordinated.current]);pending.current=undefined;}}}/></StackPanel>
            </Grid>
            <Grid row={1} margin={[10,10,10,10]}><TextBlock text={selected.description} {...subtitle}/></Grid>
          </Grid>}
        </Grid>
      </StackPanel>
    </Preview>
  </Example>;
}
// @sample:connected-list:end
// @sample:connected-repeater:start
// The shared ConnectedCollection implementation above uses a ScrollViewer and
// ItemsRepeater with focusable Grid templates, rather than Button wrappers.
// Activation, arrow navigation, scroll restoration and connection timing use
// the same Rust SDK as the ListView example.
// @sample:connected-repeater:end

// @sample:connected-card:start
export function ConnectedCards({shared}:{shared:Shared}){
  const [selected,setSelected]=useState<Item|null>(null),[smoke,setSmoke]=useState(false);
  const cards=useRef(new Map<string,Panel>()),destination=useRef<Panel|undefined>(undefined);
  const pending=useRef<Connection|undefined>(undefined),completion=useRef<(()=>void)|undefined>(undefined);
  useEffect(()=>()=>completion.current?.(),[]);
  function open(item:Item){
    const card=cards.current.get(item.id);if(!card||card.isDisposed)return;
    completion.current?.();pending.current=card.prepareConnectedAnimation('card');setSelected(item);setSmoke(true);
  }
  function close(){
    const target=selected&&cards.current.get(selected.id),detail=destination.current;
    if(!target||target.isDisposed||!detail||detail.isDisposed)return;
    const animation=detail.prepareConnectedAnimation('card-back');
    completion.current=target.on(EventKind.ConnectedAnimationCompleted,()=>{completion.current?.();completion.current=undefined;setSmoke(false);});
    const started=animation.tryStart(target,Configuration.Direct);
    setSelected(null);if(!started)setSmoke(false);
    target.focus();
  }
  return <Example name="connected-card" id="connected-animation-1" kind="ConnectedAnimation" index={1} source={source}>
    <Preview {...shared} onReady={scene=>remember('connected-1',scene)}>
      <Grid minHeight={300}>
        <GridView items={items} isHitTestVisible={!smoke} maxWidth={1400} minHeight={300} maxHeight={700} horizontalAlignment={H.Center} itemWidth={158} itemHeight={118} itemContainerStyle={{margin:[4,4,4,4],padding:[0,0,0,0]}} isItemClickEnabled onItemClick={e=>open(e.item)} renderItem={item=><Grid width={150} height={110} cornerRadius={4} clip accessibleName={item.text} onReady={node=>cards.current.set(item.id,node)}><Image source={item.image} stretch={ImageStretch.UniformToFill}/><Border padding={[8,4,8,4]} verticalAlignment={V.Bottom} acrylicResource="AcrylicBackgroundFillColorBaseBrush"><TextBlock text={item.text} {...caption}/></Border></Grid>}/>
        <Grid visible={smoke} background={{resource:'SmokeFillColorDefaultBrush'}}>
          {selected&&<Border maxWidth={400} height={320} margin={[12,12,12,12]} horizontalAlignment={H.Center} verticalAlignment={V.Center} cornerRadius={8} borderBrush={{resource:'CardStrokeColorDefaultBrush'}} borderThickness={[1,1,1,1]} onReady={node=>{destination.current=node;}}><Grid rows={[star,auto]}>
            <Image source={selected.image} stretch={ImageStretch.UniformToFill}/>
            <Button width={36} height={36} margin={[8,8,8,8]} horizontalAlignment={H.Right} verticalAlignment={V.Top} accessibleName="Close" onClick={close}><FontIcon glyph={'\uE711'} fontSize={14}/></Button>
            <StackPanel row={1} padding={[16,12,16,12]} background={{resource:'CardBackgroundFillColorDefaultBrush'}} onReady={()=>{if(destination.current){pending.current?.tryStart(destination.current);pending.current=undefined;}}}><TextBlock text={selected.text} {...subtitle}/><TextBlock text={selected.description} {...body} margin={[0,4,0,0]} foreground={{resource:'TextFillColorSecondaryBrush'}} wrap maxLines={3}/></StackPanel>
          </Grid></Border>}
        </Grid>
      </Grid>
    </Preview>
  </Example>;
}
// @sample:connected-card:end

// @sample:connected-config:start
export function ConnectedConfiguration({shared}:{shared:Shared}){
  const [page,setPage]=useState(0),[configuration,setConfiguration]=useState(0);
  const element=useRef<Panel|undefined>(undefined),pending=useRef<Connection|undefined>(undefined);
  const configurations=[Configuration.Gravity,Configuration.Gravity,Configuration.Direct,Configuration.Basic];
  function navigate(){if(!element.current||element.current.isDisposed)return;pending.current=element.current.prepareConnectedAnimation('configuration');setPage(value=>1-value);}
  function ready(node:Panel){element.current=node;pending.current?.tryStart(node,configurations[configuration]);pending.current=undefined;}
  return <Example name="connected-config" id="connected-animation-2" kind="ConnectedAnimation" index={2} source={source} options={<><ButtonOptions shared={shared} navigate={navigate} configuration={configuration} setConfiguration={setConfiguration}/></>}>
    <Preview {...shared} onReady={scene=>remember('connected-2',scene)}>
      <ScrollViewer height={500} minHeight={300}>
        {page===0?<Grid key="source" columns={[auto,star,star]} rows={[auto,auto,auto,star]}>
          <Grid row={1} column={1} minHeight={150} margin={[6,6,6,6]} background="#a9a9a9"/>
          <Grid row={1} column={2} minHeight={150} margin={[6,6,6,6]} background="#d3d3d3"/>
          <Grid row={2} column={1} minHeight={150} margin={[6,6,6,6]} background="#d3d3d3"/>
          <Grid row={2} column={2} minHeight={150} margin={[6,6,6,6]} background="#a9a9a9"/>
          <Grid row={1} rowSpan={2} minWidth={250} minHeight={150} margin={[5,5,5,5]} background={accent} onReady={ready}/>
          <Grid row={3} columnSpan={3} margin={[6,12,6,12]}><TextBlock text={lorem} wrap/></Grid>
        </Grid>:<Grid key="destination" columns={[auto,star]} rows={[auto,auto]}>
          <Grid row={1} width={150} height={200} minHeight={150} margin={[12,12,12,12]} verticalAlignment={V.Top} background={accent} onReady={ready}/>
          <StackPanel row={1} column={1} minHeight={200} margin={[12,12,12,12]} motion={{transitions:[ThemeTransition.Entrance]}}><TextBlock text="Lorem ipsum dolor sit amet, consectetur adipiscing elit" {...title} margin={[0,0,0,12]} wrap/><TextBlock text={lorem} wrap/></StackPanel>
        </Grid>}
      </ScrollViewer>
    </Preview>
  </Example>;
}
function ButtonOptions({shared,navigate,configuration,setConfiguration}:{shared:Shared;navigate:()=>void;configuration:number;setConfiguration:(value:number)=>void}){
  return <SceneView {...shared} autoHeight autoWidth><StackPanel><Button text="Navigate" horizontalAlignment={H.Stretch} onClick={navigate}/><TextBlock text="Configurations" fontSize={14} fontWeight={600} margin={[0,6,0,6]}/><RadioButtons items={['Default','Gravity','Direct','Basic']} selectedIndex={configuration} onSelectionChanged={e=>setConfiguration(e.selectedIndex??0)}/></StackPanel></SceneView>;
}
// @sample:connected-config:end

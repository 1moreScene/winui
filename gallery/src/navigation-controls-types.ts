import type {LayoutOptions,SceneEvent,CollectionItem,CollectionViewOptions,CollectionRealization,CollectionItemContainer,SceneNode,Panel} from './scene';
import type {Orientation,FlowDirection,PipsPagerButtonVisibility,PipsPagerWrapMode,TreeViewSelectionMode,TabViewWidthMode,TabViewCloseButtonOverlayMode} from './enums';

/** Navigation data remains in TypeScript; only this display metadata crosses WASM. */
export interface NavigationDataItem {
 id:string;
 text?:string;
 /** Segoe Fluent Icons glyph; rich icon content can use a header template. */ icon?:string;
 imageSource?:string;
 enabled?:boolean;
 background?:string;
 contentText?:string;
}
export type NavigationData=string|NavigationDataItem;
export interface TreeItem extends NavigationDataItem {
 /** Stable identities must be unique across the entire tree. */ children?:readonly TreeItem[];
 /** Initial expansion, or a data-bound change; false by default. */ isExpanded?:boolean;
 /** Show an expander before asynchronous children have arrived. Default false. */ hasUnrealizedChildren?:boolean;
}
export interface TabItem extends NavigationDataItem {
 /** Default true. Closing raises a request; the application removes the item. */ isClosable?:boolean;
}
export interface FlipViewOptions<T extends NavigationData=NavigationData> extends LayoutOptions {
 items?:readonly T[];
 /** Default first item (0); -1 for an empty source. */ selectedIndex?:number;
 /** Default Horizontal. */ orientation?:Orientation;
 flowDirection?:FlowDirection;
 fontSize?:number;fontWeight?:number;fontFamily?:string;
}
export interface PipsPagerOptions extends LayoutOptions {
 /** Default -1 (unbounded). Zero represents no pages. */ numberOfPages?:number;
 /** Default 0; clamped for finite page counts. */ selectedPageIndex?:number;
 /** Default 5. Zero hides pips and navigation buttons. */ maxVisiblePips?:number;
 /** Default Horizontal. */ orientation?:Orientation;
 /** Default Collapsed. */ previousButtonVisibility?:PipsPagerButtonVisibility;
 /** Default Collapsed. */ nextButtonVisibility?:PipsPagerButtonVisibility;
 /** Default None. Wrapping applies only to finite page counts. */ wrapMode?:PipsPagerWrapMode;
 flowDirection?:FlowDirection;
}
export interface BreadcrumbBarOptions<T extends NavigationData=NavigationData> extends LayoutOptions {
 items?:readonly T[];
 flowDirection?:FlowDirection;
 fontSize?:number;fontFamily?:string;
}
export interface TreeViewOptions<T extends TreeItem=TreeItem> extends Omit<CollectionViewOptions<T>,'items'|'groups'|'selectionMode'|'itemsPanel'|'hasMoreItems'|'isLoading'> {
 items?:readonly T[];
 /** Default Single; Multiple uses hierarchical checkboxes. */ selectionMode?:TreeViewSelectionMode;
 /** Optional controlled expansion. Native node isExpanded supplies the initial state. */ expandedKeys?:readonly string[];
}
export interface TabViewOptions<T extends TabItem=TabItem> extends LayoutOptions {
 items?:readonly T[];
 /** Default first tab; -1 for an empty source. */ selectedIndex?:number;
 /** Default Equal. */ tabWidthMode?:TabViewWidthMode;
 /** Default Auto. */ closeButtonOverlayMode?:TabViewCloseButtonOverlayMode;
 /** Default true. The add button raises an event. */ isAddTabButtonVisible?:boolean;
 /** Default false. Enables application drag/drop data and outside-drop requests. */ canDragTabs?:boolean;
 /** Default true. */ canReorderTabs?:boolean;
 /** Default false. */ allowDropTabs?:boolean;
 /** Space reserved for a custom strip header/footer; default 0. */ tabStripHeaderWidth?:number;tabStripFooterWidth?:number;
 tabStripBackground?:string;
 flowDirection?:FlowDirection;
}
export interface NavigationEventData {
 action:string;index?:number;key?:string|null;order?:readonly string[];parents?:Readonly<Record<string,string|null>>;
}
export interface NavigationControlEvent<T=NavigationData> extends SceneEvent {
 navigation:NavigationEventData;
 item?:T;
 index:number;
}
export interface NavigationItemsChangedEvent<T=NavigationData> extends NavigationControlEvent<T> {items:readonly T[];}
export interface NavigationPartSnapshot {
 key:string;role:string;index:number;label:string;rect:{x:number;y:number;width:number;height:number};visible:boolean;enabled:boolean;selected:boolean;
}
export interface TreeRowSnapshot {key:string;parent:string|null;depth:number;index:number;expanded:boolean;hasChildren:boolean;selected:boolean;partial:boolean;positionInSet:number;setSize:number;}
/** Presented header tracks; removed visuals are noninteractive retained display lists. */
export interface TabVisualSnapshot { readonly key:string; readonly removed:boolean; readonly opacity:number; readonly scale:number; readonly offsetY:number; }
export interface NavigationControlSnapshot {
 tabVisuals:readonly TabVisualSnapshot[];
 parts:readonly NavigationPartSnapshot[];
 slots:readonly {id:number;key:string;role:string;index:number}[];
 selectedIndex:number;selectedPageIndex:number;firstVisibleIndex:number;
 focusedPart:string|null;hoveredPart:string|null;pressedPart:string|null;
 treeRows:readonly TreeRowSnapshot[];
 dragging:boolean;dragIndex:number|null;dragTarget:number|null;
}
/** Public SDK template slot: use normal child factories; lifetime belongs to its control. */
export interface NavigationTemplateSlot {/** Stable slot identity, available before the first layout. */ readonly id:number;readonly itemKey:string;readonly index:number;readonly container:Panel;}
/** Re-exported aliases keep advanced template callbacks fully typed. */
export type TreeRealization<T extends TreeItem=TreeItem>=CollectionRealization<T>;
export type TreeTemplate<T extends TreeItem=TreeItem>=(item:T,container:CollectionItemContainer)=>void;

/** @internal */
export interface NavigationMetadata extends Required<Omit<NavigationDataItem,'background'>> {
 parent:string|null;isExpanded:boolean;hasUnrealizedChildren:boolean;isClosable:boolean;background:string|null;
}
/** @internal */
export type NavigationOwner=SceneNode & {readonly items:readonly NavigationData[]};
/** @internal */
export function normalizeNavigationDataItems(items:readonly NavigationData[],tree=false){
 const metadata:NavigationMetadata[]=[];const flat:NavigationData[]=[];const seen=new Map<string,number>();const ancestors=new Set<object>();
 const add=(item:NavigationData,parent:string|null,depth=0)=>{
  if(depth>60||metadata.length>=100000)throw new RangeError("Navigation source exceeds supported depth or item count");
  let id:string;if(typeof item==='string'){const count=seen.get(item)??0;seen.set(item,count+1);id=`text:${item}:${count}`;}else{id=item.id;if(ancestors.has(item))throw new TypeError('TreeView source contains an object cycle');}
  const value=typeof item==='string'?undefined:item;metadata.push({id,text:typeof item==='string'?item:value!.text??id,icon:value?.icon??'',imageSource:value?.imageSource??'',background:value?.background??null,contentText:value?.contentText??'',enabled:value?.enabled??true,parent,isExpanded:(value as TreeItem|undefined)?.isExpanded??false,hasUnrealizedChildren:(value as TreeItem|undefined)?.hasUnrealizedChildren??false,isClosable:(value as TabItem|undefined)?.isClosable??true});flat.push(item);
  if(tree&&value){ancestors.add(value);for(const child of (value as TreeItem).children??[])add(child,id,depth+1);ancestors.delete(value);}
 };
 for(const item of items)add(item,null);return{metadata,flat};
}

export interface SelectorBarOptions<T extends NavigationData=NavigationData> extends LayoutOptions {items?:readonly T[];selectedIndex?:number;flowDirection?:FlowDirection;fontFamily?:string;fontSize?:number;}

import {TableViewGroupState,TableViewGroupSortMode,GridUnit,NodeKind,TableViewColumnKind,TableViewSelectionUnit,TableViewGridLinesVisibility,TableViewHeadersVisibility,TableViewColumnAutoWidthMode,TableViewCornerButtonMode,TableViewRowDetailsVisibilityMode,TableViewSortDirection,ListViewSelectionMode} from './enums';
import type {GridTrack} from './sdk';
import type {LayoutOptions,BrushValue,SceneEvent,Panel,ScrollSnapshot} from './scene';

const objectRowKeys=new WeakMap<object,string>();let nextObjectRowKey=0;
/** @internal TS owns business object identity; Rust receives only its stable key. */
export function tableRowKey(item:object):string{const id=(item as {id?:unknown}).id;if(typeof id==='string'&&id.length||typeof id==='number'&&Number.isFinite(id))return String(id);let key=objectRowKeys.get(item);if(!key){key=`__winui_table_row_${++nextObjectRowKey}`;objectRowKeys.set(item,key);}return key;}
/** @internal Preserve object identity when native editing returns a new data object. */
export function retainTableRowKey(item:object,key:string){objectRowKeys.set(item,key);}

/** Stable business row/column identities, independent of sorting and recycling. */
export interface TableViewCell {row:string;column:string;}
/** Conditional cell colors, resolved by the Rust theme resource system. */
export interface TableViewCellStyle {background?:BrushValue;foreground?:BrushValue;}
/** One column. Only field is needed for a bound column; key defaults to field/path. */
export interface TableViewColumn<T extends object=Record<string,unknown>> {
 /** Property on the business object. Use path for a nested binding. */ field?:Extract<keyof T,string>;
 /** Nested property path, e.g. customer.name; overrides field. */ path?:string;
 /** Stable identity, required for an unbound template column. */ key?:string;
 /** Defaults to the bound property name. */ header?:string;
 /** Default Text. */ kind?:TableViewColumnKind;
 /** DIP, or a native Auto/Star GridTrack. Default Auto. */ width?:number|GridTrack;
 /** Default 50 and 10000 DIP. */ minWidth?:number;maxWidth?:number;
 /** Default true. */ visible?:boolean;
 /** Default false; TableView.isReadOnly takes precedence. */ isReadOnly?:boolean;
 /** Default true; TableView capability flags take precedence. */ canSort?:boolean;canFilter?:boolean;canGroup?:boolean;canResize?:boolean;canReorder?:boolean;
 /** ComboBox choices. */ options?:readonly string[];
 /** Optional property paths for operation/clipboard bindings. */ sortMemberPath?:string;clipboardMemberPath?:string;
 /** Display converter; Rust still owns cell geometry and rendering. */ format?:(value:unknown,item:T)=>string;
 /** Operation binding converter for Rust sorting/filtering. */ operationValue?:(item:T)=>unknown;
 /** Clipboard binding converter. */ clipboardValue?:(item:T)=>string;
 /** Conditional style; evaluated when business rows/columns change. */ cellStyle?:(item:T)=>TableViewCellStyle;
 /** @internal Set by a template adapter. */ hasTemplate?:boolean;
 /** @internal Set by a template adapter. */ hasEditTemplate?:boolean;
 /** @internal Set by a template adapter. */ hasHeaderTemplate?:boolean;
}
/** Sort descriptions are applied in array order. */
export interface TableViewSort {column:string;direction:TableViewSortDirection;}
/** Values is an exact allowlist (empty means no matches); omitted means all. */
export interface TableViewFilter {column:string;values?:readonly unknown[];search?:string;}
/** Column grouping in declaration order. Direction defaults to Ascending; sortMode to Key. */
export interface TableViewGroupDescription<T extends object=Record<string,unknown>> {column:string;direction?:TableViewSortDirection;sortMode?:TableViewGroupSortMode;
 /** Optional business key selector, equivalent to the native ValueDelegate. Default column operation binding. */ value?:(item:T)=>unknown;
 /** Optional business key comparer. Group formation, direction and count ordering still run in Rust. */ compare?:(a:unknown,b:unknown)=>number;
}
/** Rust-owned group identity and aggregate metadata. No business rows are fabricated for headers. */
export interface TableViewGroupInfo {id:string;path:readonly unknown[];column:string;key:unknown;count:number;level:number;isExpanded:boolean;}
/** Realized native header content slot for framework-independent templates. */
export interface TableViewGroupSlot extends TableViewGroupInfo {container:Panel;}
/** Rust-owned grid. The simplest declaration is <TableView items={rows}/>. */
export interface TableViewOptions<T extends object=Record<string,unknown>> extends LayoutOptions {
 /** Business rows; default empty. Objects stay available in typed event/template callbacks. */ items?:readonly T[];
 /** Uses item.id, otherwise object identity. Supply this to preserve selection across refreshed objects. */ getRowKey?:(item:T)=>string;
 /** Bound or template columns; omitted columns are inferred in Rust. */ columns?:readonly TableViewColumn<T>[];
 /** Default true; set false for an explicit column list. */ autoGenerateColumns?:boolean;
 /** Controlled view descriptions; defaults empty. Ctrl-click adds a sort. */ sorts?:readonly TableViewSort[];filters?:readonly TableViewFilter[];
 /** Columns to group by, e.g. ['department','active']; advanced descriptions configure direction/count ordering. Default empty. */ groups?:readonly (string|TableViewGroupDescription<T>)[];
 /** Allow the native column menu to group/ungroup. Default true. */ canGroupColumns?:boolean;
 /** Initial state of groups without an explicit user override. Default Collapsed. */ defaultGroupState?:TableViewGroupState;
 /** Pin the current native group header during vertical scrolling. Default false. */ areStickyGroupHeadersEnabled?:boolean;
 /** Preserve indentation but hide the expand button. Default true. */ showGroupExpandCollapseButton?:boolean;
 /** Group header height in DIP; default 36. */ groupHeaderHeight?:number;
 /** @internal Custom native header content slot. */ hasGroupHeaderTemplate?:boolean;
 /** Case-insensitive external search over visible bound columns; default empty. */ search?:string;
 /** Default CellOrRow. */ selectionUnit?:TableViewSelectionUnit;
 /** Default Extended. */ selectionMode?:ListViewSelectionMode;
 /** Controlled stable selections. Defaults empty. */ selectedKeys?:readonly string[];selectedCells?:readonly TableViewCell[];currentCell?:TableViewCell|null;
 /** Default false. */ isReadOnly?:boolean;
 /** Default true. */ canCopy?:boolean;canPaste?:boolean;canSortColumns?:boolean;canFilterColumns?:boolean;canResizeColumns?:boolean;canReorderColumns?:boolean;
 /** Default false; reorder is allowed only without sorting/filtering/search. */ canReorderRows?:boolean;
 /** Number of leading visible columns held during horizontal scroll. Default 0. */ frozenColumnCount?:number;
 /** Default 40, 32 and 16 DIP. Compact rows can use 32. */ rowHeight?:number;headerRowHeight?:number;rowHeaderWidth?:number;
 /** Native leading cell inset, default 16 DIP. */ cellsHorizontalOffset?:number;
 /** Default false. */ useRightClickForColumnFilter?:boolean;forceRowOrCellSelectionOnContextRequested?:boolean;
 /** Stable row keys expanded by the header toggle; default empty. */ expandedRows?:readonly string[];
 /** Default All. */ headersVisibility?:TableViewHeadersVisibility;
 /** Default All. */ gridLinesVisibility?:TableViewGridLinesVisibility;headerGridLinesVisibility?:TableViewGridLinesVisibility;
 /** Default transparent/no override. */ alternateRowBackground?:BrushValue;alternateRowForeground?:BrushValue;
 /** Separator brushes and thickness; thickness defaults to 1 DIP. */ horizontalGridLinesStroke?:BrushValue;verticalGridLinesStroke?:BrushValue;horizontalGridLinesStrokeThickness?:number;verticalGridLinesStrokeThickness?:number;
 /** Default Both. */ columnAutoWidthMode?:TableViewColumnAutoWidthMode;
 /** Default Options. */ cornerButtonMode?:TableViewCornerButtonMode;
 /** Default false. Adds CSV export to the options menu. */ showExportOptions?:boolean;
 /** Default false. */ showFilterItemsCount?:boolean;
 /** Default VisibleWhenExpanded. */ rowDetailsVisibilityMode?:TableViewRowDetailsVisibilityMode;
 /** Explicit detail slot height, default 56 DIP. */ rowDetailsHeight?:number;
 /** Default false. */ areRowDetailsFrozen?:boolean;
 /** Default true. Draw the Rust selection rectangle while dragging cells. */ showDragRectangle?:boolean;
 /** Native context menus; itemInvoked reports the action ID and current stable cell. */
 cellContextMenu?:readonly {id:string;text:string;icon?:string;enabled?:boolean}[];rowContextMenu?:readonly {id:string;text:string;icon?:string;enabled?:boolean}[];
 /** Optional paging. Default 0 (all rows); pageIndex is zero based. */ pageSize?:number;pageIndex?:number;
 /** @internal Template slot flags. */ hasRowDetailsTemplate?:boolean;hasRowHeaderTemplate?:boolean;
}
/** Event payload from the shared Rust state machine. */
export interface TableViewEventData {
 /** @internal Rust requests the browser clipboard through the shared host. */ readClipboard?:boolean;
 /** @internal Callback correlation; never required by application code. */ clientOperation?:number;
 /** @internal Source identities for native business-object updates. */ itemKeys?:readonly string[]|null;
 cell?:TableViewCell;row?:boolean;column?:string;direction?:TableViewSortDirection;value?:unknown;cancelEdit?:boolean;cancelled?:boolean;
 uri?:string;error?:string;from?:number;to?:number;text?:string;ready?:boolean;selected?:boolean;includeHeaders?:boolean;
 groups?:Omit<TableViewGroupDescription,'value'|'compare'>[];columns?:TableViewColumn[];sorts?:TableViewSort[];filters?:TableViewFilter[];selectedKeys?:string[];selectedCells?:TableViewCell[];currentCell?:TableViewCell|null;
 items?:object[]|null;pageIndex?:number;expandedRows?:string[];
}
/** Set cancel synchronously to cancel a request; value/text may be changed before edit/copy/export resolution. */
export interface TableViewEvent<T extends object=Record<string,unknown>> extends SceneEvent {table:TableViewEventData;item?:T;items:readonly T[];selectedItems:readonly T[];}
/** Cell/header/detail slot lifetime and geometry are owned by Rust. */
export interface TableViewSlot<T extends object=Record<string,unknown>> {row:string;column:string;index:number;role:'cell'|'rowHeader'|'details';editing:boolean;item:T;container:Panel;}
/** Read-only diagnostic snapshot. */
export interface TableViewSnapshot {groups:TableViewGroupDescription[];isGrouped:boolean;groupCount:number;realizedGroups:(TableViewGroupInfo&{container:number|null})[];headerSlots:{id:number;column:string}[];columns:{key:string;field:string;header:string;kind:TableViewColumnKind}[];columnWidths:number[];realized:{id:number;row:string;column:string;index:number;role:string;editing:boolean}[];viewKeys:string[];totalCount:number;filteredCount:number;selectedKeys:string[];selectedCells:TableViewCell[];currentCell:TableViewCell|null;editingCell:TableViewCell|null;expandedRows:string[];motion:{bodyOpacity:number;bodyOffsetY:number}|null;sorts:TableViewSort[];filters:TableViewFilter[];pageIndex:number;pageCount:number;scroll:ScrollSnapshot|null;}
const keys=['groups','canGroupColumns','defaultGroupState','areStickyGroupHeadersEnabled','showGroupExpandCollapseButton','groupHeaderHeight','hasGroupHeaderTemplate','cellsHorizontalOffset','useRightClickForColumnFilter','forceRowOrCellSelectionOnContextRequested','expandedRows','showDragRectangle','cellContextMenu','rowContextMenu','autoGenerateColumns','sorts','filters','search','selectionUnit','selectionMode','selectedKeys','selectedCells','currentCell','isReadOnly','canCopy','canPaste','canSortColumns','canFilterColumns','canResizeColumns','canReorderColumns','canReorderRows','frozenColumnCount','rowHeight','headerRowHeight','rowHeaderWidth','headersVisibility','gridLinesVisibility','headerGridLinesVisibility','alternateRowBackground','alternateRowForeground','horizontalGridLinesStroke','verticalGridLinesStroke','horizontalGridLinesStrokeThickness','verticalGridLinesStrokeThickness','columnAutoWidthMode','cornerButtonMode','showExportOptions','showFilterItemsCount','rowDetailsVisibilityMode','rowDetailsHeight','areRowDetailsFrozen','pageSize','pageIndex','hasRowDetailsTemplate','hasRowHeaderTemplate'];
/** @internal Business callbacks are evaluated only on source changes, never per frame. */
export function normalizeTable(kind:NodeKind,options:object){
 if(kind!==NodeKind.TableView)return options;
 const patch={...options} as Record<string,unknown>,q:Record<string,unknown>={};
 for(const key of keys)if(Object.hasOwn(patch,key)){q[key]=patch[key];delete patch[key];}
 const groups=(q.groups??[]) as readonly (string|TableViewGroupDescription<object>)[];
 const groupValue=(g:TableViewGroupDescription<object>,item:object)=>{const c=(patch.columns as TableViewColumn<object>[]|undefined)?.find(c=>(c.key??c.path??c.field)===g.column);if(g.value)return g.value(item);if(c?.operationValue)return c.operationValue(item);const field=c?.sortMemberPath??c?.path??c?.field??g.column;return field.split('.').reduce<unknown>((v,k)=>v&&typeof v==='object'?(v as Record<string,unknown>)[k]:undefined,item);};
 if(Array.isArray(q.groups))q.groups=groups.map(g=>{if(typeof g==='string')return{column:g};const {value,compare,...rest}=g;if(!compare)return rest;const unique=new Map<string,unknown>();for(const item of (patch.items??[]) as object[]){const key=groupValue(g,item)??null;unique.set(JSON.stringify(key),key);}const keys=[...unique.values()].sort(compare),comparisonRanks:Record<string,number>={};let rank=0;keys.forEach((key,index)=>{if(index&&compare(keys[index-1],key)!==0)rank++;comparisonRanks[JSON.stringify(key)]=rank;});return{...rest,comparisonRanks};});
 const columns=patch.columns as readonly TableViewColumn<object>[]|undefined;
 if(columns){const seen=new Set<string>();q.columns=columns.map(c=>{const {format,operationValue,clipboardValue,cellStyle,path,...rest}=c;const field=path??c.field??'';const key=c.key??field;if(!key||seen.has(key))throw new TypeError('TableView columns require unique keys');seen.add(key);return{...rest,field,key,header:c.header??field,width:typeof c.width==='number'?{unit:GridUnit.Pixel,value:c.width}:c.width??{unit:GridUnit.Auto,value:1}};});delete patch.columns;}
 if(Object.hasOwn(patch,'items')){const items=(patch.items??[]) as readonly object[];const keyOf=(patch.getRowKey as ((item:object)=>string)|undefined)??tableRowKey;const seen=new Set<string>();q.items=items.map(item=>{const id=keyOf(item);if(!id||seen.has(id))throw new TypeError('TableView rows require unique stable identities (avoid duplicate id or repeated object references)');seen.add(id);const display:Record<string,string>={},operations:Record<string,unknown>={},clipboard:Record<string,string>={},groupValues:Record<string,unknown>={},styles:Record<string,TableViewCellStyle>={};for(const c of columns??[]){const field=c.path??c.field??'',key=c.key??field;const value=field.split('.').reduce<unknown>((v,k)=>v&&typeof v==='object'?(v as Record<string,unknown>)[k]:undefined,item);if(c.format)display[key]=c.format(value,item);if(c.operationValue)operations[key]=c.operationValue(item);if(c.clipboardValue)clipboard[key]=c.clipboardValue(item);if(c.cellStyle)styles[key]=c.cellStyle(item);}for(const g of groups)if(typeof g!=='string'&&g.value)groupValues[g.column]=groupValue(g,item)??null;return{id,fields:Object.keys(item),values:item,display,operations,groupValues,clipboard,styles};});delete patch.items;}
 delete patch.getRowKey;if(Object.keys(q).length)patch.table=q;return patch;
}

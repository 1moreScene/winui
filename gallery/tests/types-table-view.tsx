import {TableView,SceneView,TextBlock} from 'winui-wasm/react';
import {TableViewGroupState,TableViewGroupSortMode,TableViewColumnKind,TableViewSelectionUnit,TableViewSortDirection,ThemeMode,type TableViewController as Controller,type TableViewOptions} from 'winui-wasm';
type Row={id:string;name:string;age:number};
const rows:Row[]=[{id:'a',name:'Ada',age:37}];
const valid:TableViewOptions<Row>={items:rows,columns:[{field:'age',kind:TableViewColumnKind.Number}],selectionUnit:TableViewSelectionUnit.Cell};
const sample=<SceneView><TableView {...valid} columns={[{field:'name',renderHeader:()=> <TextBlock text="Person"/>,renderCell:item=><TextBlock text={item.name}/>}]} onItemsChanged={items=>items[0].age.toFixed()} onReady={(table:Controller<Row>)=>table.sort('age',TableViewSortDirection.Descending)}/></SceneView>;
// @ts-expect-error Closed enum properties reject bare strings.
const invalidUnit:TableViewOptions<Row>={selectionUnit:'Cell'};
// @ts-expect-error Column kinds reject a different enum.
const invalidKind:TableViewOptions<Row>={columns:[{field:'name',kind:ThemeMode.Dark}]};
// @ts-expect-error Field names are checked against the business object.
const invalidField:TableViewOptions<Row>={columns:[{field:'missing'}]};
void [sample,invalidUnit,invalidKind,invalidField];

const grouped=<TableView items={rows} groups={['name',{column:'age',value:row=>Math.floor(row.age/10),compare:(a,b)=>Number(b)-Number(a),sortMode:TableViewGroupSortMode.Count}]} defaultGroupState={TableViewGroupState.Expanded} renderGroupHeader={group=><TextBlock text={String(group.key)}/>} onGrouping={event=>{event.cancel=event.table.column==='name';}} onReady={table=>{table.expandGroup(['Ada']);table.sortGroups('age',TableViewGroupSortMode.Key);}}/>;
// @ts-expect-error Group state rejects raw strings.
const invalidGroupState:TableViewOptions<Row>={defaultGroupState:'Expanded'};
// @ts-expect-error Group sort mode rejects an unrelated enum.
const invalidGroupSort:TableViewOptions<Row>={groups:[{column:'age',sortMode:ThemeMode.Dark}]};
void [grouped,invalidGroupState,invalidGroupSort];

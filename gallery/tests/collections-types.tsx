import{ListView,GridView}from'../src/react';
import{ItemsUpdatingScrollMode,DataPackageOperation,VerticalAlignment,type CollectionViewOptions,type CollectionDragEvent}from'../src/index';
const options:CollectionViewOptions={groups:[{id:'a',header:'A',items:[{id:'1',text:'First'}]}],itemsUpdatingScrollMode:ItemsUpdatingScrollMode.KeepItemsInView,itemsPanelVerticalAlignment:VerticalAlignment.Bottom,canDragItems:true};
const valid=<ListView {...options} onDragOver={e=>{e.acceptedOperation=DataPackageOperation.Move;}}/>;
// @ts-expect-error Closed options require their runtime enum.
const invalid=<ListView itemsUpdatingScrollMode="KeepScrollOffset"/>;
// @ts-expect-error A different enum is not a drag operation.
const wrong=(e:CollectionDragEvent)=>{e.acceptedOperation=VerticalAlignment.Bottom;};
// @ts-expect-error Strings cannot silently enable a boolean capability.
const wrongCapability=<GridView canReorderItems="true"/>;
void valid;void invalid;void wrong;void wrongCapability;

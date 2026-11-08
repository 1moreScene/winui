import {StackLayout,UniformGridLayout,Orientation,UniformGridLayoutItemsStretch,UniformGridLayoutItemsJustification,RefreshPullDirection,RefreshVisualizerOrientation,type Scene} from '../src/index';
import {ItemsRepeater,RefreshContainer,RefreshVisualizer,TextBlock} from '../src/react';
import {FlowLayout,ActivityFeedLayout,VariedImageSizeLayout,FlowLayoutLineAlignment} from '../src/index';
function contract(scene:Scene){
 const repeat=scene.root.itemsRepeater({items:[{id:'a',text:'A'}],layout:new StackLayout({orientation:Orientation.Horizontal,spacing:8})});repeat.setItemTemplate((item,slot)=>slot.text({text:item.text}));repeat.update({layout:new UniformGridLayout({itemsStretch:UniformGridLayoutItemsStretch.Fill,itemsJustification:UniformGridLayoutItemsJustification.Center})});
 const refresh=scene.root.refreshContainer({pullDirection:RefreshPullDirection.TopToBottom});const off=refresh.onRefreshRequested(e=>{const d=e.getDeferral();d.complete();});off();refresh.onRefresh(async()=>{});refresh.requestRefresh();refresh.dispose();repeat.dispose();
 // @ts-expect-error Closed enums reject strings.
 new StackLayout({orientation:'Vertical'});
 // @ts-expect-error Closed enums reject strings.
 new UniformGridLayout({itemsStretch:'Fill'});
 // @ts-expect-error Incompatible enums must be rejected.
 scene.root.refreshContainer({pullDirection:Orientation.Vertical});
 repeat.update({layout:new FlowLayout({lineAlignment:FlowLayoutLineAlignment.SpaceBetween})});repeat.update({layout:new ActivityFeedLayout({minItemSize:[80,108]})});repeat.update({layout:new VariedImageSizeLayout({width:200})});
 // @ts-expect-error Closed flow alignment rejects bare strings.
 new FlowLayout({lineAlignment:'Start'});
 return <><ItemsRepeater items={['A']} layout={new StackLayout()} renderItem={item=><TextBlock text={item}/>}/><RefreshContainer onRefresh={async()=>{}}/><RefreshVisualizer visualizerOrientation={RefreshVisualizerOrientation.Normal}/></>;
}
void contract;

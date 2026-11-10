import{createRoot}from'react-dom/client';
import{WinUI,RendererBackend,ThemeMode,Orientation,FlowDirection,ListViewSelectionMode,HorizontalAlignment}from'winui-wasm';
import{WinUIProvider,SceneView,Canvas,ListView,GridView}from'winui-wasm/react';
import{ContactTemplate,PhotoItem,type PhotoTemplate}from'../src/CollectionTemplates';
import data from'../src/collections-data.json';
export async function mountCollectionFixture(row:any,backend:RendererBackend){
 const sdk=await WinUI.create({globalScrollbars:false});const host=document.createElement('div');host.id='collections-fixture';host.style.cssText=`position:fixed;inset:0;width:1000px;height:${row.capture?.rootHeight??500}px;z-index:99999`;document.body.append(host);const root=createRoot(host);
 const position={canvasLeft:24,canvasTop:24,horizontalAlignment:HorizontalAlignment.Left};
 const props={...position,width:row.input.width,enabled:row.input.enabled,selectionMode:row.input.selectionMode as ListViewSelectionMode,selectedKeys:row.input.selectedIndex===1?[row.kind==='GalleryContacts'?data.contacts[1].id:data.photos[1].id]:[]};
 const scene=await new Promise<import('winui-wasm').Scene>(resolve=>root.render(<WinUIProvider runtime={sdk}><SceneView theme={row.theme as ThemeMode} backend={backend} reducedMotion style={{height:row.capture?.rootHeight??500}} onReady={resolve}><Canvas>
 {row.kind==='GalleryContacts'?<ListView {...props} items={data.contacts} height={400} selectionMode={row.input.selectionMode as ListViewSelectionMode} flowDirection={row.input.flowDirection as FlowDirection} borderThickness={[1,1,1,1]} borderBrush={{resource:'ControlStrongStrokeColorDefaultBrush'}} renderItem={contact=><ContactTemplate contact={contact}/>}/>:<GridView {...props} items={data.photos} orientation={Orientation.Horizontal} maximumRowsOrColumns={row.input.maximumRowsOrColumns??-1} itemContainerStyle={row.kind==='GalleryStyledGrid'?{margin:[row.input.gap,row.input.gap,row.input.gap,row.input.gap]}:undefined} renderItem={item=><PhotoItem item={item} template={row.input.template as PhotoTemplate}/>}/>}
 </Canvas></SceneView></WinUIProvider>));
 return{sdk,scene,unmount:()=>{root.unmount();sdk.dispose();host.remove();}};
}

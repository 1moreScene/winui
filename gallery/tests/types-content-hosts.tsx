import {ContentControl,ContentPresenter,UserControl,Page,SceneFrame} from 'winui-wasm/react';
import {HorizontalAlignment,VerticalAlignment,NodeKind,NavigationCacheMode,NavigationTransition,type ContentTemplate,type SceneFrameController as Controller} from 'winui-wasm';
const content:ContentTemplate={kind:NodeKind.StackPanel,children:[{kind:NodeKind.TextBlock,properties:{text:'Hello'}},{kind:NodeKind.Button,name:'save',properties:{text:'Save'}}]};
export const valid=<><ContentControl content="Hello"/><ContentPresenter horizontalContentAlignment={HorizontalAlignment.Center}/><UserControl><Page content="A page"/></UserControl><SceneFrame pages={[{key:'main',content,cacheMode:NavigationCacheMode.Required}]} onReady={f=>f.navigate('main',{transition:NavigationTransition.Entrance})}/></>;
// @ts-expect-error Closed enum values require runtime enum members.
export const bare=<ContentControl horizontalContentAlignment="Center"/>;
// @ts-expect-error Wrong enum family.
export const wrong=<ContentPresenter horizontalContentAlignment={VerticalAlignment.Center}/>;
// @ts-expect-error Typo is rejected.
export const typo=<SceneFrame pages={[{key:'a',content,cacheMode:NavigationCacheMode.Enabeld}]}/>;
// @ts-expect-error Nested Frame templates are not supported.
export const nested:ContentTemplate={kind:NodeKind.Frame};
export function API(f:Controller){f.navigate('main',{parameter:1,transition:NavigationTransition.Suppress});f.goBack();f.goForward();f.clearHistory();return f.onNavigating(e=>{e.cancel=e.frameNavigation.to.page==='blocked';});}

import {SceneNavigationView,NavigationViewContent,NavigationViewItem,Frame,AutoSuggestBox} from 'winui-wasm/react';
import {NavigationViewBackButtonVisible,NavigationViewOverflowLabelMode,NavigationViewShoulderNavigationEnabled,NavigationViewSlot,NodeKind,IconSourceKind,Symbol,type WinUI} from 'winui-wasm';
export const valid=<SceneNavigationView header={null} content={null} isBackButtonVisible={NavigationViewBackButtonVisible.Auto} overflowLabelMode={NavigationViewOverflowLabelMode.NoLabel} shoulderNavigationEnabled={NavigationViewShoulderNavigationEnabled.Always}><Frame pages={[{key:'page',contentResource:'gallery/SamplePage1'}]} onReady={f=>f.navigate('page')}/><NavigationViewContent slot={NavigationViewSlot.AutoSuggestBox}><AutoSuggestBox/></NavigationViewContent><NavigationViewContent slot={NavigationViewSlot.PaneFooter}><NavigationViewItem iconSource={{kind:IconSourceKind.Symbol,symbol:Symbol.Download}}/></NavigationViewContent></SceneNavigationView>;
// @ts-expect-error Native back visibility is a three-state enum, not a boolean.
export const booleanBack=<SceneNavigationView isBackButtonVisible={true}/>;
// @ts-expect-error Bare enum strings are rejected.
export const bare=<SceneNavigationView isBackButtonVisible="Auto"/>;
// @ts-expect-error Wrong enum family is rejected.
export const wrong=<NavigationViewContent slot={NavigationViewBackButtonVisible.Auto}/>;
// @ts-expect-error Unknown slot names are rejected.
export const typo=<NavigationViewContent slot={NavigationViewSlot.PaneFoooter}/>;
export function basic(sdk:WinUI,host:HTMLElement){const nav=sdk.navigationView(host);const frame=nav.content.sceneFrame({pages:[{key:'page',content:{kind:NodeKind.TextBlock,properties:{text:'Hello'}}}]});frame.navigate('page');return nav;}

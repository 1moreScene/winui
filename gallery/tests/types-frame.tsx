import {Frame} from 'winui-wasm/react';
import {NavigationCacheMode,NavigationTransition,NavigationMode,type WinUI} from 'winui-wasm';
const example=<Frame page="home" cacheMode={NavigationCacheMode.Enabled} transition={NavigationTransition.Entrance} renderPage={entry=><p>{entry.page}</p>}/>;
// @ts-expect-error Cache mode requires the public runtime enum.
const bad=<Frame cacheMode="Enabled" renderPage={()=>null}/>;
// @ts-expect-error Transition choices cannot accept a different enum.
const badTransition=<Frame transition={NavigationMode.New} renderPage={()=>null}/>;
declare const sdk:WinUI;
const controller=sdk.frame({resolvePage:()=>({create:()=>document.createElement('article'),cacheMode:NavigationCacheMode.Required})});
controller.navigate('home',{transition:NavigationTransition.SlideFromRight});
// @ts-expect-error Bare closed strings must fail.
controller.navigate('home',{transition:'Entrance'});
// @ts-expect-error Mistyped enum members must fail.
controller.setCacheMode('home',NavigationCacheMode.enabled);
void[example,bad,badTransition];

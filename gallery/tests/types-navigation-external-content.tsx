import {NavigationView} from 'winui-wasm/react';
import {LightDismissOverlayMode,ThemeMode} from 'winui-wasm';
const valid=<NavigationView hasExternalContent lightDismissOverlayMode={LightDismissOverlayMode.On}/>;
// @ts-expect-error Closed native choices require the SDK enum.
const raw=<NavigationView lightDismissOverlayMode="On"/>;
// @ts-expect-error Unrelated enums cannot select an overlay policy.
const wrong=<NavigationView lightDismissOverlayMode={ThemeMode.Light}/>;
void [valid,raw,wrong];

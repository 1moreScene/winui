import {NumberBox,ComboBox,AutoSuggestBox,ContentDialog,TeachingTip} from 'winui-wasm/react';
import {NumberBoxSpinButtonPlacementMode,NumberBoxValidationMode,ContentDialogButton,TeachingTipPlacementMode,TeachingTipTailVisibility,type NumberBoxOptions,type ComposedEvent} from 'winui-wasm';
const valid:NumberBoxOptions={value:null,spinButtonPlacementMode:NumberBoxSpinButtonPlacementMode.Compact,validationMode:NumberBoxValidationMode.Disabled};
const samples=<><NumberBox {...valid}/><ComboBox items={['One','Two']} isEditable/><AutoSuggestBox items={[{id:'one',text:'One',data:42}]}/><ContentDialog title="Save?" defaultButton={ContentDialogButton.Primary}/><TeachingTip preferredPlacement={TeachingTipPlacementMode.BottomLeft} tailVisibility={TeachingTipTailVisibility.Visible}/></>;
// @ts-expect-error closed choices require the exported enum
const bad:NumberBoxOptions={spinButtonPlacementMode:'Inline'};
// @ts-expect-error incompatible enum
const wrong:NumberBoxOptions={validationMode:TeachingTipPlacementMode.Top};
// @ts-expect-error public properties are direct
const wrapped=<NumberBox options={{value:1}}/>;
// @ts-expect-error default button requires an enum
const dialog=<ContentDialog defaultButton="Primary"/>;
const handler=(event:ComposedEvent)=>{const deferral=event.getDeferral?.();if(deferral)deferral.complete();};
void [samples,bad,wrong,wrapped,dialog,handler];

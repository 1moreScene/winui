import {InfoBar,PersonPicture,RatingControl,SplitButton,ToggleSplitButton} from 'winui-wasm/react';
import {InfoBarSeverity,RatingItemKind,FlowDirection,type InfoBarOptions,type RatingControlOptions} from 'winui-wasm';
const valid:InfoBarOptions={isOpen:true,severity:InfoBarSeverity.Warning};
const rating:RatingControlOptions={ratingItemInfo:{kind:RatingItemKind.Font,glyph:'★'},flowDirection:FlowDirection.RightToLeft};
const samples=<><InfoBar {...valid}/><PersonPicture displayName="Jane Doe"/><RatingControl {...rating}/><SplitButton text="Save"/><ToggleSplitButton isChecked/></>;
// @ts-expect-error finite severity must use the public runtime enum
const bad:InfoBarOptions={severity:'Warning'};
// @ts-expect-error incompatible runtime enum
const wrong:InfoBarOptions={severity:FlowDirection.RightToLeft};
// @ts-expect-error descriptor kind must use the runtime enum
const descriptor:RatingControlOptions={ratingItemInfo:{kind:'Font',glyph:'★'}};
// @ts-expect-error public React props are flat
const wrapped=<InfoBar options={{isOpen:true}}/>;
// @ts-expect-error SplitButton uses its native split template, not Button variants
const variant=<SplitButton variant="Accent"/>;
void [samples,bad,wrong,descriptor,wrapped,variant];

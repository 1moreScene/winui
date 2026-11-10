import {ItemsViewSelectionMode,PagerControlDisplayMode,PagerControlButtonVisibility,FontStyle,StandardCommandKind,FeaturedTileLayout,StackLayout,LinedFlowLayout,LinedFlowLayoutItemsStretch,TextAlignment} from 'winui-wasm';
import type {ItemsViewOptions,PagerControlOptions,RichTextBlockOptions,LayoutPanelOptions} from 'winui-wasm';
import {ItemsView,PagerControl,RichTextBlock,LayoutPanel} from 'winui-wasm/react';
const pager:PagerControlOptions={displayMode:PagerControlDisplayMode.ButtonPanel,nextButtonVisibility:PagerControlButtonVisibility.HiddenOnEdge};
const items:ItemsViewOptions={items:['one'],selectionMode:ItemsViewSelectionMode.Extended,layout:new StackLayout()};
const rich:RichTextBlockOptions={paragraphs:[{runs:[{text:'Bold',fontWeight:700,fontStyle:FontStyle.Italic,link:'help'}]}]};
const panel:LayoutPanelOptions={layout:new FeaturedTileLayout({spacing:8})};
const views=<><ItemsView {...items}/><PagerControl {...pager}/><RichTextBlock {...rich}/><LayoutPanel {...panel}/></>;
// @ts-expect-error Bare finite strings are rejected.
const bad:PagerControlOptions={displayMode:'ButtonPanel'};
// @ts-expect-error An unrelated enum is rejected.
const wrong:PagerControlOptions={displayMode:StandardCommandKind.Save};
// @ts-expect-error Bare selection strings are rejected.
const badSelection:ItemsViewOptions={selectionMode:'Extended'};
void[views,bad,wrong,badSelection];
const lined:ItemsViewOptions={layout:new LinedFlowLayout({lineHeight:80,itemsStretch:LinedFlowLayoutItemsStretch.Fill})};
const highlighted:RichTextBlockOptions={textAlignment:TextAlignment.Justify,textHighlighters:[{background:'#ffff00',ranges:[{startIndex:1,length:2}]}],paragraphs:[{runs:[{text:'',inline:'badge'}]}]};
// @ts-expect-error Finite layout choices require a runtime enum.
new LinedFlowLayout({itemsStretch:'Fill'});
// @ts-expect-error Text alignment requires its own enum.
const badAlign:RichTextBlockOptions={textAlignment:ItemsViewSelectionMode.Single};
void[lined,highlighted,badAlign];

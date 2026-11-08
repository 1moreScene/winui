import {Orientation,WrapPanelItemsStretch,FlyoutShowMode,ThemeMode,OverlayPlacement,type CommandBarFlyout,type SceneNode,type WrapPanelOptions,type CommandBarFlyoutOptions} from '../src/index';
const wrap:WrapPanelOptions={orientation:Orientation.Horizontal,itemsStretch:WrapPanelItemsStretch.Last};
const flyout:CommandBarFlyoutOptions={showMode:FlyoutShowMode.Standard};
// @ts-expect-error Closed values require the public runtime enum.
const invalid:WrapPanelOptions={itemsStretch:'Last'};
// @ts-expect-error Unrelated enum values cannot substitute for flow orientation.
const wrong:WrapPanelOptions={orientation:ThemeMode.Light};
// @ts-expect-error Raw strings cannot substitute for FlyoutShowMode.
const wrongMode:CommandBarFlyoutOptions={showMode:'Transient'};
void [wrap,flyout,invalid,wrong,wrongMode];
function checkShowAt(control:CommandBarFlyout,target:SceneNode){
 control.showAt(target,{showMode:FlyoutShowMode.Transient,placement:OverlayPlacement.RightEdgeAlignedTop});
 // @ts-expect-error The mode must be a runtime enum member.
 control.showAt(target,{showMode:'Transient'});
 // @ts-expect-error Placement must be a runtime enum member.
 control.showAt(target,{placement:'RightEdgeAlignedTop'});
}
void checkShowAt;

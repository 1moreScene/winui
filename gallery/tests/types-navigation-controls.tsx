import {FlipView,PipsPager,TreeView,TabView} from '../src/react';
import {Orientation,PipsPagerButtonVisibility,PipsPagerWrapMode,TreeViewSelectionMode,TabViewWidthMode,TabViewCloseButtonOverlayMode} from '../src/index';
const valid=[<FlipView orientation={Orientation.Vertical}/>,<PipsPager wrapMode={PipsPagerWrapMode.Wrap} nextButtonVisibility={PipsPagerButtonVisibility.Visible}/>,<TreeView selectionMode={TreeViewSelectionMode.Multiple}/>,<TabView tabWidthMode={TabViewWidthMode.Compact} closeButtonOverlayMode={TabViewCloseButtonOverlayMode.OnPointerOver} allowDropTabs/>];
// @ts-expect-error Closed choices require their exported runtime enum.
const badOrientation=<FlipView orientation="Horizontal"/>;
// @ts-expect-error Different control enums cannot be interchanged.
const badMode=<TreeView selectionMode={TabViewWidthMode.Equal}/>;
// @ts-expect-error Misspelled enum members are rejected.
const badMember=<PipsPager wrapMode={PipsPagerWrapMode.wrap}/>;
// @ts-expect-error Match the native AllowDropTabs property.
const badDrop=<TabView allowDrop/>;
void [valid,badOrientation,badMode,badMember,badDrop];

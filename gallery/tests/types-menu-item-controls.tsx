import {FlowDirection,KeyboardAcceleratorModifier,type MenuFlyoutItemOptions,type RadioMenuFlyoutItemOptions,type Scene} from '../src/index';
import {MenuFlyout,MenuFlyoutItem,MenuFlyoutSubItem,MenuFlyoutSeparator,RadioMenuFlyoutItem,ToggleMenuFlyoutItem} from '../src/react';
const command:MenuFlyoutItemOptions={text:'Open',keyboardAccelerators:[{key:'o',modifiers:[KeyboardAcceleratorModifier.Control]}]};
const radio:RadioMenuFlyoutItemOptions={text:'Portrait',groupName:'orientation',isChecked:true};
const jsx=<MenuFlyout flowDirection={FlowDirection.RightToLeft}><MenuFlyoutItem {...command}/><ToggleMenuFlyoutItem text="Toolbar"/><MenuFlyoutSubItem text="Size"><RadioMenuFlyoutItem {...radio}/></MenuFlyoutSubItem><MenuFlyoutSeparator/></MenuFlyout>;
void jsx;
function sdk(scene:Scene){const m=scene.root.menuFlyout();m.menuFlyoutItem(command);m.radioMenuFlyoutItem(radio);m.menuFlyoutSubItem({text:'More'}).toggleMenuFlyoutItem({text:'Option'});m.menuFlyoutSeparator();}
void sdk;
// @ts-expect-error Accelerator modifiers require the public runtime enum.
const bare:MenuFlyoutItemOptions={keyboardAccelerators:[{key:'o',modifiers:['Control']}]};
// @ts-expect-error Menu radio controls have exactly two checked states.
const mixed:RadioMenuFlyoutItemOptions={isChecked:null};
// @ts-expect-error A submenu owns child controls, not a separately implemented item array.
const subtree=<MenuFlyoutSubItem text="More" items={[]}/>;
void [bare,mixed,subtree];

// @ts-expect-error Logical direction uses the exported runtime enum.
const bareDirection=<MenuFlyout flowDirection="RightToLeft"/>;
void bareDirection;

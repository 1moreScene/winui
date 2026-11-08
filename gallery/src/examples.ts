import { ItemKind, PaneDisplayMode, ThemeMode as Theme, EventKind, type NavigationItem, type NavigationViewOptions, type WinUI } from './index';

export const icons = { play: '\uE768', save: '\uE74E', refresh: '\uE72C', download: '\uE896', home: '\uE80F', account: '\uE77B', mail: '\uE715', calendar: '\uE787', library: '\uE8F1', map: '\uE707', tag: '\uE8EC', shop: '\uE719', help: '\uE897' };
const menu = (): NavigationItem[] => [icons.play, icons.save, icons.refresh, icons.download].map((icon, i) => ({ id: `page${i + 1}`, text: `Menu Item${i + 1}`, icon }));
const category = (id: string, text: string, icon: string): NavigationItem => ({ id, text, icon });
export const exampleNames = [
  'NavigationView with default PaneDisplayMode',
  'NavigationView with PaneDisplayMode set to Top',
  'NavigationView that switches pane orientation based on window width',
  'Tying selection and focus - Tabs',
  'Data binding',
  'NavigationView with Footer Menu Items',
  'Hierarchical NavigationView',
  'API in action',
];
export const galleryPaneMaterial=(theme:Theme)=>({tintColor:theme===Theme.Light?'#ffffff':'#1f1f1f',tintOpacity:0.8,fallbackColor:theme===Theme.Light?'#f2f2f2':'#1f1f1f'});
export function exampleOptions(index: number, theme: Theme): NavigationViewOptions {
  const options: NavigationViewOptions = { items: menu(), selectedId: 'page1', theme, isBackButtonVisible:true, expandedPaneMaterial:galleryPaneMaterial(theme),header: 'Sample Page 1', content: 'This is the content for Sample Page 1.' };
  if (index === 1 || index === 3) { options.paneDisplayMode = PaneDisplayMode.Top; options.header = index===1?'This is Header Text':''; }
  if(index===2)options.header='';
  if (index === 3) {options.selectionFollowsFocus = true;options.isBackButtonVisible=false;}
  if (index === 4) {
    options.items = [category('page1', 'Category 1', icons.home), category('page2', 'Category 2', '\uE765'),
      { id: 'separator', text: '', kind: ItemKind.Separator }, { id: 'header', text: 'More categories', kind: ItemKind.Header },
      category('page3', 'Category 3', icons.library), category('page4', 'Category 4', icons.mail)];
    options.paneDisplayMode = PaneDisplayMode.Left;
  }
  if (index === 5) {
    options.items = [category('page1', 'Browse', icons.library), category('page2', 'Track an Order', icons.map), category('page3', 'Order History', icons.tag)];
    options.footerItems = [category('page4', 'Account', icons.account), category('page5', 'Your Cart', icons.shop), category('page6', 'Help', icons.help)];
    options.isSettingsVisible = false; options.paneDisplayMode = PaneDisplayMode.Left;
    options.header='This is Header Text';
  }
  if (index === 6) {
    options.items = [category('page1', 'Home', icons.home),
      { ...category('page2', 'Account', icons.account), children: [category('page3', 'Mail', icons.mail), category('page4', 'Calendar', icons.calendar)] },
      { id: 'documents', text: 'Document options', icon: '\uE7C3', selectsOnInvoked: false, children: [category('page5', 'Create new', '\uE8F4'), category('page6', 'Upload file', '\uE8E5')] }];
    options.paneDisplayMode = PaneDisplayMode.Left;
  }
  if (index === 7) {
    options.items = [menu()[0], { id: 'header', text: 'Actions', kind: ItemKind.Header }, menu()[1], menu()[2]];
    options.paneDisplayMode = PaneDisplayMode.Left; options.expandedModeThresholdWidth = 500;
    options.isBackButtonVisible = true; options.isBackEnabled = false;
  }
  return options;
}
/** The Gallery displays this actual module as its executable TypeScript source. */
export function createExample(sdk: WinUI, host: HTMLElement, index: number, theme: Theme) {
  const view = sdk.navigationView(host, exampleOptions(index, theme));
  const output = { lastEvent: 'Ready', count: 0 };
  view.on(EventKind.SelectionChanged, e => {
    const title = e.itemId === '$settings' ? 'Settings' : `Sample Page ${e.itemId?.replace('page', '') ?? ''}`;
    view.batch([{ header: title }, { content: `This is the content for ${title}.` }]);
  });
  return { view, output };
}

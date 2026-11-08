import { useEffect, useRef, useState } from 'react';
import { galleryPaneMaterial } from './examples';
import { NavigationView } from './react';
import { EventKind, ItemKind, PaneDisplayMode, type NavigationView as Controller,
  type NavigationItem, type NavigationSnapshot, type ThemeMode } from './index';
import { galleryGroups, itemById, itemForRoute } from './gallery-catalog';

const groups = (special: boolean): NavigationItem[] => galleryGroups.filter(group => group.special === special).map(group => ({
  id: `group:${group.id}`, text: group.title, icon: group.icon, selectsOnInvoked: false,
  children: [{ id: `category:${group.id}`, text: `All ${group.title.toLowerCase()}` },
    ...group.items.map(item => ({ id: item.id, text: item.title }))],
}));
const items: NavigationItem[] = [
  { id: 'gallery-home', text: 'Home', icon: '\uE80F' }, ...groups(true),
  { id: 'gallery-controls', text: 'Controls', kind: ItemKind.Header },
  { id: 'gallery-all', text: 'All', icon: '\uE8A9' }, ...groups(false),
];

/** App data and routing only. The existing NavigationView owns all menu layout,
 * input, selection, hierarchy, scrolling, pane state and indicator animation. */
export function GalleryNavigation({ route, theme, onSnapshot, onReady }: {
  route: string; theme: ThemeMode;
  onSnapshot: (snapshot: Readonly<NavigationSnapshot>) => void;
  onReady: (control: Controller) => void;
}) {
  const control = useRef<Controller | null>(null);
  const [policies,setPolicies]=useState(()=>({motion:matchMedia('(prefers-reduced-motion: reduce)').matches,transparency:matchMedia('(prefers-reduced-transparency: reduce)').matches}));
  useEffect(()=>{
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),transparency=matchMedia('(prefers-reduced-transparency: reduce)');
    const update=()=>setPolicies({motion:motion.matches,transparency:transparency.matches});
    motion.addEventListener('change',update);transparency.addEventListener('change',update);
    return()=>{motion.removeEventListener('change',update);transparency.removeEventListener('change',update);};
  },[]);
  const item = itemForRoute(route);
  const selectedId = item?.id ?? (route.startsWith('#category/') ? `category:${route.slice(10)}`
    : route === '#settings' ? '$settings' : route === '#all' ? 'gallery-all' : 'gallery-home');
  useEffect(() => {
    const groupId = item?.groupId ?? (route.startsWith('#category/') ? route.slice(10) : '');
    if (groupId) control.current?.setExpanded(`group:${groupId}`, true);
  }, [route, item?.groupId]);
  // DOM page content cannot be sampled by this Canvas surface. Use WinUI's
  // resource fallback instead of blurring the full viewport on every hover.
  return <NavigationView id="home-navigation" className="home-sidebar gallery-navigation" style={{ width: '100%', height: 'calc(100dvh - 48px)' }}
    items={items} selectedId={selectedId} theme={theme} paneDisplayMode={PaneDisplayMode.Auto}
    isBackButtonVisible={false} isPaneToggleButtonVisible={false} openPaneLength={320}
    isSettingsVisible isBackdropAvailable={false} expandedPaneMaterial={galleryPaneMaterial(theme)}
    reducedMotion={policies.motion} reducedTransparency={policies.transparency} alwaysShowHeader={false}
    onReady={view => {
      control.current = view;
      window.gallery.navigation = view;
      onReady(view);
      if (item?.groupId) view.setExpanded(`group:${item.groupId}`, true);
    }}
    onSnapshot={onSnapshot}
    onEvent={event => {
      if (event.kind !== EventKind.ItemInvoked || !event.itemId) return;
      const id = event.itemId;
      const href = id === 'gallery-home' ? '#home' : id === 'gallery-all' ? '#all'
        : id === '$settings' ? '#settings' : id.startsWith('category:') ? `#category/${id.slice(9)}`
        : itemById.get(id)?.href;
      if (href) location.hash = href;
    }} />;
}

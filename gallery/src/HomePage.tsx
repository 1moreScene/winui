import { GalleryButton, GalleryComboBox, GalleryOption, GallerySearchBox } from './GalleryControls';
import { SceneView, SelectorBar } from './react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ButtonVariant, DisplayMode, ThemeMode, type NavigationView as Controller, type NavigationSnapshot, type AutoSuggestBox } from './index';
import {
  galleryGroups, galleryItems, itemById, readGalleryList, writeGalleryList,
  favoritesKey, recentKey, type GalleryItem,
  itemForRoute,
} from './gallery-catalog';
import { GalleryThemeContext, initialGalleryTheme } from './gallery-theme';
import { GalleryNavigation } from './GalleryNavigation';
import { Frame } from './react';
import { NavigationCacheMode, NavigationMode, type Frame as FrameController, type PageStackEntry } from './index';
import { GalleryPageHeader } from './GalleryPageHeader';
import './home.css';
import './sample-pages.css';

const assets = '/official/home/Assets/';
const resources = [
  { title: 'Getting started', description: 'Get started with WinUI and explore detailed documentation.', image: 'Header-WinUI.png', href: 'https://aka.ms/winui-getstarted' },
  { title: 'Design', description: 'Guidelines and toolkits for creating stunning WinUI experiences.', image: 'Header-WindowsDesign.png', href: 'https://learn.microsoft.com/windows/apps/design/' },
  { title: 'WinUI on GitHub', description: 'Explore the WinUI source code and repository.', icon: 'github', href: 'https://github.com/microsoft/microsoft-ui-xaml' },
  { title: 'Community Toolkit', description: 'A collection of helper functions, controls, and app services.', image: 'Header-Toolkit.png', href: 'https://apps.microsoft.com/store/detail/windows-community-toolkit-sample-app/9NBLGGH4TLCQ' },
  { title: 'Code samples', description: 'Find samples that demonstrate specific tasks, features, and APIs.', icon: '\uE943', href: 'https://learn.microsoft.com/windows/apps/get-started/samples' },
  { title: 'Partner Center', description: 'Upload your app to the Store.', image: 'store', href: 'https://developer.microsoft.com/windows/' },
];

function Glyph({ children }: { children: ReactNode }) {
  return <span className="fluent" aria-hidden="true">{children}</span>;
}

function HorizontalCards({ children, label }: { children: ReactNode; label: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const element = scroller.current!;
    const update = () => setEdges({ left: element.scrollLeft > 1, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, [children]);
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 488, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  return <div className="home-horizontal">
    <div ref={scroller} className="home-horizontal-content" aria-label={label}>{children}</div>
    {edges.left && <GalleryButton iconOnly width={20} height={38} glyphSize={12} className="home-scroll-arrow back" aria-label={`Scroll ${label} left`} onClick={() => scroll(-1)}><Glyph>{'\uEDD9'}</Glyph></GalleryButton>}
    {edges.right && <GalleryButton iconOnly width={20} height={38} glyphSize={12} className="home-scroll-arrow next" aria-label={`Scroll ${label} right`} onClick={() => scroll(1)}><Glyph>{'\uEDDA'}</Glyph></GalleryButton>}
  </div>;
}

function SampleCards({ items }: { items: GalleryItem[]; favorites: string[]; toggleFavorite: (id: string) => void }) {
  return <div className="home-sample-grid">{items.map(item => <article className="home-sample" key={item.id} data-sample-id={item.id}>
    <a className="home-sample-link" href={item.href}>
      <img src={item.image} alt="" width="32" height="32" loading="lazy" />
      <div><strong>{item.title}</strong><p title={item.subtitle}>{item.subtitle}</p></div>
      {!item.implemented && <span className="home-pending">{item.excludedReason ? '范围外' : '待实现'}</span>}
    </a>
  </article>)}</div>;
}

export function GalleryShell({ route, renderPage }: { route: string; renderPage: (route:string)=>ReactNode }) {
  const [theme, setTheme] = useState(initialGalleryTheme);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'recent' | 'favorites'>('recent');
  const [favorites, setFavorites] = useState(() => readGalleryList(favoritesKey));
  const [recent, setRecent] = useState(() => readGalleryList(recentKey));
  const navigation = useRef<Controller | null>(null);
  const pageFrame=useRef<FrameController<PageStackEntry>|null>(null);
  const [pageHistory,setPageHistory]=useState({back:false,forward:false});
  const [geometry, setGeometry] = useState({ paneWidth: 0, contentX: 0, paneOpen: false, overlay: false });
  const paneOpen = geometry.paneOpen;
  const searchInput = useRef<AutoSuggestBox>(null);
  const query = search.trim().toLocaleLowerCase();
  const filtered = galleryItems.filter(item => query.split(/\s+/).every(token=>[item.title,...item.tags].some(text=>text.toLocaleLowerCase().includes(token))));
  const suggestions = query ? [...filtered].sort((a,b)=>Number(b.title.toLocaleLowerCase().startsWith(query))-Number(a.title.toLocaleLowerCase().startsWith(query))||a.title.localeCompare(b.title)).map(item=>({id:item.id,text:item.title})) : [];
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('winui-gallery.theme', theme); } catch { /* Optional persistence. */ }
  }, [theme]);
  useEffect(() => {
    setSearch('');
    setRecent(readGalleryList(recentKey));
  }, [route]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['f', 'k'].includes(event.key.toLowerCase())) {
        event.preventDefault(); searchInput.current?.focus();
      }
      if(event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){const available=event.key==='ArrowLeft'?pageFrame.current?.canGoBack:pageFrame.current?.canGoForward;if(available){event.preventDefault();event.key==='ArrowLeft'?history.back():history.forward();}}
      if (event.key === 'Escape') { setSearch(''); navigation.current?.update({ isPaneOpen: false }); }
    };
    window.addEventListener('keydown', listener, {capture:true});
    return () => window.removeEventListener('keydown', listener, {capture:true});
  }, []);
  function toggleFavorite(id: string) {
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      writeGalleryList(favoritesKey, next);
      return next;
    });
  }
  const cardProps = { favorites, toggleFavorite };
  function updateGeometry(snapshot: Readonly<NavigationSnapshot>) {
    const next = { paneWidth: snapshot.pane.width, contentX: snapshot.content.x,
      paneOpen: snapshot.isPaneOpen, overlay: snapshot.isPaneOpen && snapshot.displayMode !== DisplayMode.Expanded };
    setGeometry(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
  }
  const shellStyle = { '--gallery-content-x': `${geometry.contentX}px`, '--gallery-pane-width': `${geometry.paneWidth}px` } as CSSProperties;
  function renderContent(route:string){
    const children=renderPage(route);
    const groupId = route.startsWith('#category/') ? route.slice('#category/'.length) : '';
    const group = galleryGroups.find(g => g.id === groupId);
    const item = route.startsWith('#sample/') ? itemById.get(route.slice('#sample/'.length)) : undefined;
    const activeItem = item ?? itemForRoute(route);
    const settings = route === '#settings';
    const all = route === '#all';
    const ContentHost = children ? 'div' : 'main';
    const hasPage = !!children || !!item;
    return (
    <ContentHost className={`home-main ${hasPage ? 'gallery-item-page' : ''}`} data-gallery-page={route}>
      {hasPage && !query && <GalleryPageHeader key={activeItem?.id ?? route} item={activeItem} title={route.slice(1).replaceAll('-', ' ')} favorite={!!activeItem && favorites.includes(activeItem.id)} onFavorite={() => activeItem && toggleFavorite(activeItem.id)} />}
      <div className="gallery-scroll-content">
      {hasPage && activeItem && !query && <p className="gallery-page-description">{activeItem.description}</p>}
      {children && <div className="home-sample-page" hidden={!!query}>{children}</div>}
      {query ? <div className="home-content"><h1>Search results</h1><p className="home-result-count" role="status">{filtered.length} results for “{search.trim()}”</p><SampleCards items={filtered} {...cardProps} />{!filtered.length && <p className="home-empty">No results found. Try another control name or keyword.</p>}</div>
      : children ? null
      : settings ? <div className="home-content"><h1>Settings</h1><section className="home-settings-card"><div><h2>App theme</h2><p>Select the theme for the Gallery and its samples.</p></div><GalleryComboBox aria-label="App theme" value={theme} onValueChanged={event => setTheme(event as ThemeMode)}>{Object.values(ThemeMode).map(value => <GalleryOption key={value}>{value}</GalleryOption>)}</GalleryComboBox></section><p className="home-about">WinUI Gallery · Rust / WASM<br />Official Gallery baseline: 7360ac3</p></div>
      : item ? <div className="home-content"><section className="home-placeholder"><img src={item.image} alt="" width="64" height="64" /><h2>{item.excludedReason ? '范围外（不实现）' : '此示例尚未实现'}</h2><p>{item.excludedReason || '已按官方 WinUI Gallery 目录保留入口，后续接入真实控件示例。'}</p><a href="#all">Browse all samples</a></section></div>
      : group || all ? <div className="home-content"><h1>{group?.title ?? 'All samples'}</h1><SampleCards items={group ? galleryItems.filter(i => i.groupId === group.id) : galleryItems} {...cardProps} /></div>
      : <>
        <section className="home-hero" aria-labelledby="home-heading">
          <div className="home-hero-art" aria-hidden="true" />
          <div className="home-hero-heading"><p>Windows App SDK 2.5 (experimental)</p><h1 id="home-heading">WinUI Gallery</h1></div>
          <HorizontalCards label="resources">{resources.map(resource => <a className="home-resource" key={resource.title} href={resource.href} target="_blank" rel="noreferrer">
            {resource.image ? <img src={`${assets}HomeHeaderTiles/${resource.image === 'store' ? `Header-Store.${theme === ThemeMode.Light ? 'light' : 'dark'}.png` : resource.image}`} alt="" /> : resource.icon === 'github' ? <svg viewBox="0 0 98 96" aria-hidden="true"><path fill="currentColor" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" /></svg> : <Glyph>{resource.icon}</Glyph>}
            <div><strong>{resource.title}</strong><p>{resource.description}</p></div><span className="home-resource-external"><Glyph>{'\uE8A7'}</Glyph></span>
          </a>)}</HorizontalCards>
        </section>
        <div className="home-tabs">
          <SceneView theme={theme} autoHeight style={{height:40,width:320}}><SelectorBar accessibleName="Home samples" items={[{id:'recent',text:'Recent',icon:'\uE823'},{id:'favorites',text:'Favorites',icon:'\uE734'}]} selectedIndex={tab==='recent'?0:1} onSelectionChanged={event=>setTab(event.index===1?'favorites':'recent')}/></SceneView>
        </div>
        <div className="home-samples" role="region" id="home-sample-panel" aria-label={tab==='recent'?'Recent samples':'Favorite samples'}>
          {tab === 'recent' ? <>
            {!!recent.length && <section className="home-recent"><h2>Recently visited</h2><HorizontalCards label="recently visited samples"><SampleCards items={recent.map(id => itemById.get(id)!)} {...cardProps} /></HorizontalCards></section>}
            <h2>Recently added or updated</h2><SampleCards items={galleryItems.filter(i => i.isNew || i.isUpdated)} {...cardProps} />
          </> : favorites.length ? <SampleCards items={favorites.map(id => itemById.get(id)!)} {...cardProps} /> : <div className="home-empty"><img src={`${assets}ControlImages/RatingControl.png`} height="36" alt="" /><strong>No favorites yet</strong><p>Favorite samples by clicking the star icon on the sample page.</p></div>}
        </div>
      </>}
      </div>
    </ContentHost>
    );
  }
  return <GalleryThemeContext.Provider value={[theme, setTheme]}><div className="home-gallery" style={shellStyle}>
    <header className="home-titlebar">
      <GalleryButton iconOnly width={32} variant={ButtonVariant.Subtle} className="home-history-back" aria-label="Go back" disabled={!pageHistory.back} onClick={()=>history.back()}><Glyph>{'\uE72B'}</Glyph></GalleryButton>
      <GalleryButton iconOnly width={32} variant={ButtonVariant.Subtle} className="home-history-forward" aria-label="Go forward" disabled={!pageHistory.forward} onClick={()=>history.forward()}><Glyph>{'\uE72A'}</Glyph></GalleryButton>
      <GalleryButton iconOnly variant={ButtonVariant.Subtle} className="home-pane-toggle" aria-label="Toggle navigation pane" aria-expanded={paneOpen} aria-controls="home-navigation" onClick={() => navigation.current?.update({ isPaneOpen: !paneOpen })}><Glyph>{'\uE700'}</Glyph></GalleryButton>
      <a href="#home" className="home-brand"><img src={`${assets}Tiles/AppList.targetsize-32.png`} alt="" width="20" height="20" /><span>WinUI Gallery</span></a>
      <div className="home-search"><GallerySearchBox ref={searchInput} aria-label="Search controls and samples" placeholder="Search controls and samples..." value={search} onValueChanged={setSearch}
        items={query&&!suggestions.length?[{id:'no-results',text:'No results found',enabled:false}]:suggestions}
        onQuerySubmitted={event=>{const item=event.chosenItem;if(item&&typeof item!=='string'){const entry=itemById.get(item.id);if(entry)location.hash=entry.href;}}}/>
      </div>
    </header>
    <GalleryNavigation route={route} theme={theme} onReady={control => { navigation.current = control; }} onSnapshot={updateGeometry} />
    {geometry.overlay && <div className="home-pane-backdrop" aria-label="Close navigation pane" onPointerDown={() => navigation.current?.update({ isPaneOpen: false })} />}
    <span id="runtime-status" className="sr-only">Ready</span>
    <Frame className="gallery-frame" page={route || '#home'} cacheMode={NavigationCacheMode.Enabled} cacheSize={10}
      onReady={frame => {
        pageFrame.current=frame; window.gallery.frame=frame;
        frame.onSnapshot(state=>setPageHistory(previous=>previous.back===!!state.backStack.length&&previous.forward===!!state.forwardStack.length?previous:{back:!!state.backStack.length,forward:!!state.forwardStack.length}));
      }}
      onNavigating={event=>{
        const id=history.state?.winuiFrameEntry as number|undefined;
        const frame=pageFrame.current;
        if(event.mode===NavigationMode.New&&id&&frame&&frame.snapshot.current?.id!==id&&[...frame.snapshot.backStack,...frame.snapshot.forwardStack].some(entry=>entry.id===id)){
          event.cancel=true;queueMicrotask(()=>frame.goToEntry(id));
        }
      }}
      onNavigated={event=>{
        history.replaceState({...history.state,winuiFrameEntry:event.entry.id},'');
        if((location.hash||'#home')!==event.entry.page)location.replace(event.entry.page);
      }}
      renderPage={entry=>renderContent(entry.page)} />
  </div></GalleryThemeContext.Provider>;
}

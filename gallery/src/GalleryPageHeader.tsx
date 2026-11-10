import { useState } from 'react';
import { ThemeMode } from 'winui-wasm';
import type { GalleryItem } from './gallery-catalog';
import { useGalleryTheme } from './gallery-theme';
import { GalleryButton, GalleryMenu, GalleryInformation } from './GalleryControls';

const repository='https://github.com/microsoft/WinUI-Gallery';
const commit='7360ac322414e118eadfb0c7c2f4ecc31a218f59';
const external=(href:string)=>()=>window.open(href,'_blank','noopener,noreferrer');
function Icon({glyph}:{glyph:string}) {return <span className="fluent" aria-hidden="true">{glyph}</span>;}

export function GalleryPageHeader({item,title,favorite,onFavorite}:{item?:GalleryItem;title?:string;favorite:boolean;onFavorite:()=>void}) {
  const [theme,setTheme]=useGalleryTheme(),[copied,setCopied]=useState(false);
  const name=item?.title??title??'Sample';
  const community=item?.communitySource;
  return <header className="gallery-page-header">
    <div className="gallery-page-title"><h1>{name}</h1>
      {item?.namespace&&<GalleryInformation className="gallery-api" aria-label="API details" title="API details" lines={['Namespace',item.namespace,'Inheritance',`${item.baseClasses.join(' › ')} › ${item.id}`]}/>}
    </div>
    <div className="gallery-page-commands"><div className="gallery-page-links">
      {!!item?.docs.length&&<GalleryMenu label="Documentation" items={item.docs.map((doc,index)=>({id:String(index),text:doc.Title,invoke:external(doc.Uri)}))}/>}
      <GalleryMenu label="Source" items={community?[
        {id:'sample',text:'Community TableView sample',invoke:external(`${community.repository}/blob/${community.commit}/${community.sample}`)},
        {id:'repository',text:'WinUI.TableView repository',invoke:external(`${community.repository}/tree/${community.commit}`)},
        {id:'license',text:'MIT license',invoke:external(`${community.repository}/blob/${community.commit}/LICENSE.md`)},
      ]:[
        {id:'sample',text:'Official Gallery sample',invoke:external(`${repository}/${item?.samplePage?`blob/${commit}/${item.samplePage}`:`tree/${commit}/WinUIGallery/Samples`}`)},
        {id:'repository',text:'WinUI Gallery repository',invoke:external(`${repository}/tree/${commit}`)},
      ]}/>
    </div><div className="gallery-page-actions">
      <GalleryButton iconOnly width={40} id="theme" aria-label="Toggle theme" title="Toggle theme" onClick={()=>setTheme(theme===ThemeMode.Dark?ThemeMode.Light:ThemeMode.Dark)}><Icon glyph={'\uE793'}/></GalleryButton>
      <span className="gallery-command-separator"/>
      <GalleryButton iconOnly width={40} title={copied?'Link copied':'Copy link'} aria-label={copied?'Link copied':'Copy link'} onClick={async()=>{try{await navigator.clipboard.writeText(location.href);setCopied(true);}catch{setCopied(false);}}}><Icon glyph={copied?'\uE73E':'\uE71B'}/></GalleryButton>
      {item&&<GalleryButton iconOnly width={40} title="Favorite sample" aria-label={`${favorite?'Unfavorite':'Favorite'} ${name}`} aria-pressed={favorite} onClick={onFavorite}><Icon glyph={favorite?'\uE735':'\uE734'}/></GalleryButton>}
    </div></div>
  </header>;
}

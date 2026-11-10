import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react';
import chinese from './gallery-zh.json';

export type GalleryLanguage = 'en' | 'zh-CN';
const Context = createContext<{language: GalleryLanguage; toggle: () => void}>({language:'en',toggle:()=>{}});
const normalize = (text:string) => text.replace(/\s+/g,' ').trim();
const translations = new Map(Object.entries(chinese).map(([key,value])=>[normalize(key),value]));
export function GalleryLanguageProvider({children}:{children:ReactNode}) {
  const [language,setLanguage]=useState<GalleryLanguage>(()=>{
    try{return localStorage.getItem('winui-gallery.language')==='zh-CN'?'zh-CN':'en';}catch{return 'en';}
  });
  useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('winui-gallery.language',language);}catch{/* Optional persistence. */}},[language]);
  return <Context.Provider value={{language,toggle:()=>setLanguage(value=>value==='en'?'zh-CN':'en')}}>{children}</Context.Provider>;
}
export const useGalleryLanguage=()=>useContext(Context);
/** Only business prose is localized. Control/API identifiers and source code remain unchanged. */
export function LocalizedText({children}:{children:ReactNode}) {
  const {language}=useGalleryLanguage();
  function translate(content:ReactNode):ReactNode {
    return Children.map(content,child=>{
      if(typeof child==='string')return language==='en'?child:child.replace(/\S[\s\S]*\S|\S/,text=>translations.get(normalize(text))??text);
      if(isValidElement<{children?:ReactNode}>(child)&&typeof child.type==='string'&&!['code','pre'].includes(child.type))return cloneElement(child,{},translate(child.props.children));
      return child;
    });
  }
  return <>{translate(children)}</>;
}

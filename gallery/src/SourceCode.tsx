import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import type { Token, TokenStream } from 'prismjs';
import type { PresentedSource, SourceLanguage } from './source-presentation';
import './source-code.css';

type SourceCodeProps = Omit<HTMLAttributes<HTMLPreElement>, 'children'> & {
  children: string | undefined;
  language?: SourceLanguage;
};

function renderTokens(tokens: TokenStream): ReactNode {
  if (typeof tokens === 'string') return tokens;
  if (Array.isArray(tokens)) return tokens.map((token, index) =>
    typeof token === 'string' ? token : renderToken(token, index));
  return renderToken(tokens, 0);
}

function renderToken(token: Token, key: number): ReactNode {
  const aliases = token.alias ? [token.alias].flat() : [];
  return <span key={key} className={['token', token.type, ...aliases].join(' ')}>
    {renderTokens(token.content)}
  </span>;
}

/** Formats the displayed sample only; the source of the running example stays intact. */
export function SourceCode({ children = '', language = 'tsx', className = '', ...props }: SourceCodeProps) {
  const [result, setResult] = useState<PresentedSource | null>(null);
  const element=useRef<HTMLPreElement>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!element.current)return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}});
    observer.observe(element.current);return()=>observer.disconnect();
  },[]);
  useEffect(() => {
    if(!visible)return;
    let active = true;
    void import('./source-presentation')
      .then(module => module.presentSource(children, language))
      .then(value => { if (active) setResult(value); })
      .catch(() => { /* Raw, selectable source remains available if loading fails. */ });
    return () => { active = false; };
  }, [children, language, visible]);

  const current = result?.source === children && result.language === language ? result : null;
  return <pre {...props} ref={element} className={`source-code ${className}`} data-source-language={language}
    data-source-status={current?.status ?? 'loading'}>
    <code className={`language-${language === 'xaml' ? 'xml' : language}`}>
      {current ? renderTokens(current.tokens) : children}
    </code>
  </pre>;
}

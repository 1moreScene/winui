import Prism from 'prismjs';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-csharp.js';

// React owns the token spans; Prism must never rewrite the DOM itself.
Prism.manual = true;

export type SourceLanguage = 'tsx' | 'xaml' | 'csharp';
export type PresentedSource = {
  source: string;
  language: SourceLanguage;
  status: 'formatted' | 'original';
  tokens: Prism.TokenStream;
};

const cache = new Map<string, Promise<PresentedSource>>();

async function formatSource(source: string, language: SourceLanguage): Promise<string> {
  if (language === 'csharp') return source;
  const { format } = await import('prettier/standalone');
  if (language === 'xaml') {
    const { default: xml } = await import('@prettier/plugin-xml');
    return (await format(source, {
      parser: 'xml', plugins: [xml], printWidth: 88, tabWidth: 2,
      xmlWhitespaceSensitivity: 'preserve',
    })).trimEnd();
  }

  const [babel, estree] = await Promise.all([
    import('prettier/plugins/babel'), import('prettier/plugins/estree'),
  ]);
  const options = { parser: 'babel-ts', plugins: [babel, estree], printWidth: 88, tabWidth: 2 };
  // Marked samples can contain sibling JSX elements, rather than a whole TS module.
  // A temporary fragment lets Prettier parse them without adding markup to the sample.
  if (/^\s*(?:<|\{\/\*)/.test(source)) {
    const wrapped = await format(`<>\n${source}\n</>`, options);
    return wrapped.replace(/^<>\n/, '').replace(/\n<\/>;\s*$/, '')
      .split('\n').map(line => line.startsWith('  ') ? line.slice(2) : line).join('\n');
  }
  return (await format(source, options)).trimEnd();
}

async function present(source: string, language: SourceLanguage): Promise<PresentedSource> {
  let text = source;
  let status: PresentedSource['status'] = 'original';
  try {
    text = await formatSource(source, language);
    if (language !== 'csharp') status = 'formatted';
  } catch {
    // Incomplete or mixed official excerpts remain readable in their original form.
  }
  return { source, language, status,
    tokens: Prism.tokenize(text, Prism.languages[language === 'xaml' ? 'markup' : language]) };
}

export function presentSource(source: string, language: SourceLanguage): Promise<PresentedSource> {
  const key = `${language}\0${source}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const result = present(source, language);
  cache.set(key, result);
  // Bound retained source and tokens when navigating through a large Gallery.
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  void result.catch(() => { if (cache.get(key) === result) cache.delete(key); });
  return result;
}

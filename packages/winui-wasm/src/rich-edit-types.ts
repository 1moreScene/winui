import type {TextBoxOptions} from './scene';
import type {RichEditAlignment,RichEditListStyle} from './enums';

/** Optional fields inherit the control font. Formatting a selection only changes supplied fields. */
export interface RichCharacterFormat {
  /** Bold face; false selects normal weight. */ bold?: boolean | null;
  /** Italic face; false selects normal style. */ italic?: boolean | null;
  /** Single underline. */ underline?: boolean | null;
  /** Single strike through. */ strikethrough?: boolean | null;
  /** Font size in DIP, 1–512. */ fontSize?: number | null;
  /** Font family, inheriting the control font when omitted. */ fontFamily?: string | null;
  /** Open #RRGGBB or #RRGGBBAA color; high contrast uses the theme foreground. */ foreground?: string | null;
}
/** Paragraph format. Omitted fields inherit defaults in a document; formatParagraph preserves unchanged fields. */
export interface RichParagraphFormat {
  /** Default RichEditAlignment.Left. */ alignment?: RichEditAlignment;
  /** Default RichEditListStyle.None. */ listStyle?: RichEditListStyle;
}
/** Embedded image input. Omitted dimensions use the encoded pixel size and preserve aspect ratio. */
export type RichImageSource=Omit<RichEmbeddedImage,"width"|"height"> & Partial<Pick<RichEmbeddedImage,"width"|"height">>;
/** Self-contained raster image stored in the Rust document. */
export interface RichEmbeddedImage {
  /** Self-contained PNG/JPEG base64 data URL, up to 8 MiB. */ source:string;
  /** Display width/height in DIP, greater than 0 and at most 8192. */ width:number;height:number;
  /** Accessible image description. */ altText?:string;
}
/** Contiguous text or one embedded object, with one character format. */
export interface RichEditRun {
  /** Text run, or one U+FFFC character for an image or MathML object. */ text: string;
  format?: RichCharacterFormat;
  image?:RichEmbeddedImage;
  /** Presentation MathML document. Mutually exclusive with image. */ mathml?:string;
}
/** Serializable Rust document. Paragraph entries correspond to LF-delimited paragraphs. */
export interface RichEditDocument {
  runs: RichEditRun[];
  paragraphs?: RichParagraphFormat[];
}
/** RichEditBox accepts plain text or a rich document, with UTF-16 selections.
 * Defaults: multiline, wrapping and spell check enabled. RTF and Presentation
 * MathML are parsed by Rust; the full Windows TOM object model is not replicated. */
export interface RichEditBoxOptions extends TextBoxOptions,
  Pick<import('./scene').ScrollViewerOptions, 'horizontalScrollMode' | 'verticalScrollMode' | 'horizontalScrollBarVisibility' | 'verticalScrollBarVisibility'> {
  /** Initial/controlled rich document. Supply only one of text, document, rtf or mathML per update. */
  document?: RichEditDocument;
  /** Initial/controlled RTF. Set only one content source per update. */ rtf?:string;
  /** Initial/controlled Presentation MathML. Set only one content source per update. */ mathML?:string;
}

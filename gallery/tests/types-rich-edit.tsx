import {RichEditBox,SceneView} from 'winui-wasm/react';
import {RichEditAlignment,RichEditListStyle,type Scene,type RichEditBoxController as Editor,type RichEditDocument} from 'winui-wasm';
export const document:RichEditDocument={runs:[{text:'Hello',format:{bold:true,foreground:'#ff0000'}}],paragraphs:[{alignment:RichEditAlignment.Center,listStyle:RichEditListStyle.Bullet}]};
export const example=<SceneView><RichEditBox document={document} onReady={e=>{e.select(0,5);e.toggleBold();e.formatParagraph({listStyle:RichEditListStyle.Decimal});e.replaceSelection('World');}}/></SceneView>;
export function plain(scene:Scene):Editor {return scene.root.richEditBox({document});}
// @ts-expect-error closed list values must use the SDK enum
export const invalidList=<RichEditBox document={{runs:[],paragraphs:[{listStyle:'Bullet'}]}}/>;
// @ts-expect-error incompatible enums cannot specify alignment
export const invalidAlignment=<RichEditBox document={{runs:[],paragraphs:[{alignment:RichEditListStyle.None}]}}/>;
// @ts-expect-error an embedded image requires typed metadata, not a URL string
export const invalidRun:RichEditDocument={runs:[{text:'',image:'example.png'}]};

export const rtfEditor=<RichEditBox rtf="{\\rtf1 Hello}" onReady={e=>{e.loadRtf(new Uint8Array());e.insertImage({source:'data:image/png;base64,...'});e.insertMathML('<math><mi>x</mi></math>');e.getRtf();e.getMathML();e.replaceSelectedDocument(e.getSelectedDocument());}}/>;
export const mathEditor=<RichEditBox mathML="<math><mi>x</mi></math>"/>;

import {parseSync} from '../packages/winui-wasm/node_modules/rolldown/dist/utils-index.mjs';
import {walk} from './gallery-control-source.mjs';

const htmlControls=new Set(['input','select','textarea','button','details','summary','option','dialog','progress','meter','menu']);
const controlRoles=new Set(['button','checkbox','radio','switch','slider','spinbutton','combobox','listbox','menu','menuitem','tab','tablist','scrollbar','progressbar','dialog','tree','treeitem']);
const hostFunctions=new Set(['Frame','HostedFrame','NavigationView','SceneRoot']);
const runtimeCalls=new Map([['Frame','frame'],['HostedFrame','frame'],['NavigationViewContent','slot'],['NavigationView','navigationView'],['SceneRoot','scene'],['WinUIProvider','create']]);

export function parse(name,text){
  const result=parseSync(name,text);
  if(result.errors.length)throw new Error(`${name}: ${JSON.stringify(result.errors)}`);
  return result.program;
}
const member=(node,object,property)=>node?.type==='MemberExpression'&&node.object?.name===object&&(node.property?.name??node.property?.value)===property;
const value=node=>node?.value??node?.expression?.value;

/** Scan syntax, not displayed source strings. DOM text/layout and business
 * callbacks remain legal; control chrome and dismiss handling belong to Rust. */
export function auditFrontend(name,text){
  const errors=[];const ast=parse(name,text);
  const factories=new Set(['createElement']),reactNames=new Set(['React']);
  for(const node of ast.body)if(node.type==='ImportDeclaration'&&node.source.value==='react')for(const specifier of node.specifiers){
    if(specifier.imported?.name==='createElement')factories.add(specifier.local.name);
    if(['ImportDefaultSpecifier','ImportNamespaceSpecifier'].includes(specifier.type))reactNames.add(specifier.local.name);
  }
  const error=(node,reason)=>errors.push({file:name,line:text.slice(0,node.start).split('\n').length,reason});
  walk(ast,node=>{
    if(node.type==='JSXOpeningElement'&&/^[a-z]/.test(node.name.name??'')){
      const tag=node.name.name,attrs=node.attributes;
      if(htmlControls.has(tag))error(node,`HTML ${tag} substitutes for an SDK control`);
      if(attrs.some(a=>a.name?.name==='role'&&controlRoles.has(value(a.value))))error(node,'Interactive ARIA control implemented outside the SDK');
      if(attrs.some(a=>/^on(?:Pointer|Mouse|Touch|Click|DoubleClick|ContextMenu|Drag)/.test(a.name?.name??'')))error(node,'DOM activation/hit areas must use SDK controls');
      for(const attr of attrs.filter(a=>/^on(Pointer|Mouse|Touch|Key)/.test(a.name?.name??''))){
        walk(attr.value,n=>{if(['Property','ObjectProperty'].includes(n.type)&&(n.key?.name??n.key?.value)==='isPaneOpen')error(attr,'Navigation light-dismiss input must be owned by the SDK');});
      }
    }
    if(node.type==='CallExpression'&&([...reactNames].some(name=>member(node.callee,name,'createElement'))||factories.has(node.callee?.name))){
      if(htmlControls.has(value(node.arguments[0])))error(node,'createElement bypasses the SDK control adapter');
    }
  });
  return errors;
}

/** Every public React function must reach the shared SDK adapter through its
 * real helper/component graph. A name in a registry alone is not evidence. */
export function auditReact(text){
  const ast=parse('react.tsx',text),functions=new Map(),exported=[],errors=[];
  for(const statement of ast.body){
    const node=statement.type==='ExportNamedDeclaration'?statement.declaration:statement;
    if(node?.type==='FunctionDeclaration'){functions.set(node.id.name,node);if(statement.type==='ExportNamedDeclaration')exported.push(node.id.name);}
    if(statement.type==='ExportNamedDeclaration'&&node?.type==='VariableDeclaration')for(const declaration of node.declarations)if(declaration.id.name!=='PageNavigationContext')errors.push(`React value export ${declaration.id.name??'<pattern>'} needs an SDK adapter review`);
    // Reviewed public SDK passthrough: shared enums, options, utilities and
    // Controller-suffixed handles. Other sources,
    // namespace exports and named value re-exports still require adapter review.
    const sdkPassthrough=statement.type==='ExportAllDeclaration'&&statement.source.value==='./index'&&!statement.exported;
    if(!sdkPassthrough&&(statement.type==='ExportAllDeclaration'||statement.type==='ExportNamedDeclaration'&&statement.specifiers.length&&statement.exportKind!=='type'))errors.push('React re-exports need an SDK adapter review');
  }
  const graph=new Map();
  for(const [name,node] of functions){
    const edges=new Set();graph.set(name,edges);
    walk(node.body,n=>{
      if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&functions.has(n.callee.name))edges.add(n.callee.name);
      if(n.type==='JSXOpeningElement'&&functions.has(n.name.name))edges.add(n.name.name);
      if(n.type==='JSXOpeningElement'&&/^[a-z]/.test(n.name.name??'')&&(!hostFunctions.has(name)||n.name.name!=='div'))errors.push(`${name} renders control DOM instead of SDK nodes`);
      if(n.type==='CallExpression'&&n.callee?.type==='MemberExpression'&&['getContext','animate','setPointerCapture'].includes(n.callee.property?.name))errors.push(`${name} implements painting, animation or input capture in React`);
    });
  }
  const reaches=(name,seen=new Set())=>{
    if(seen.has(name))return false;seen.add(name);
    if(name==='NodeElement')return true;
    if(runtimeCalls.has(name)){
      let found=false;walk(functions.get(name)?.body,n=>{if(n.type==='CallExpression'&&(member(n.callee,'runtime',runtimeCalls.get(name))||member(n.callee,'WinUI',runtimeCalls.get(name))||(name==='NavigationViewContent'&&member(n.callee,'parent','slot'))))found=true;});
      if(found)return true;
    }
    return [...graph.get(name)??[]].some(next=>reaches(next,seen));
  };
  for(const name of exported)if(!reaches(name))errors.push(`${name} has no call path to the shared Rust SDK adapter`);
  const kinds=new Set();walk(ast,n=>{if(n.type==='MemberExpression'&&n.object?.name==='NodeKind')kinds.add(n.property.name);});
  const nodeElement=functions.get('NodeElement');let createsNode=false;
  walk(nodeElement?.body,n=>{if(n.type==='CallExpression'&&member(n.callee,'scene','create'))createsNode=true;});
  if(!createsNode)errors.push('NodeElement no longer creates shared SDK scene nodes');
  return {errors,exports:exported,kinds:[...kinds]};
}

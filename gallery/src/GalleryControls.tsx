/** Gallery mounting adapters only. All input, painting, selection, keyboard,
 * popup and checked state belong to the existing SDK controls in ./react. */
import { Children, isValidElement, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type KeyboardEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { SceneView, CheckBox, RadioButton, ComboBox, AutoSuggestBox, NumberBox, Slider, TextBox, Button, ToggleButton, Expander, StackPanel, TextBlock, FontIcon, DropDownButton, MenuFlyout, Flyout } from 'winui-wasm/react';
import { ButtonVariant, HorizontalAlignment, Orientation, VerticalAlignment, OverlayPlacement, type AutoSuggestBoxController as SearchController, type CollectionItem, type ComposedEvent, type Scene, type ExpanderController, type TextBoxController } from 'winui-wasm';
import { useGalleryTheme } from './gallery-theme';
import './gallery-controls.css';

type HostProps = { id?:string; className?:string; style?:CSSProperties; title?:string; hidden?:boolean; disabled?:boolean; 'aria-label'?:string; 'aria-describedby'?:string; 'aria-expanded'?:boolean; 'aria-selected'?:boolean; 'aria-controls'?:string; role?:string; tabIndex?:number; onKeyDown?:(event:KeyboardEvent<HTMLDivElement>)=>void };
function textOf(node:ReactNode):string {
  return Children.toArray(node).map(child => typeof child==='string'||typeof child==='number' ? String(child) : isValidElement<{children?:ReactNode;glyph?:string}>(child) ? child.props.glyph ?? textOf(child.props.children) : '').join('').replace(/\s+/g,' ').trim();
}
function Surface({kind,children,fitWidth=false,...props}:HostProps & {kind:string;children:(name:string)=>ReactNode;fitWidth?:boolean}) {
  const [theme] = useGalleryTheme();
  const host=useRef<HTMLDivElement>(null), [name,setName]=useState(props['aria-label']??''),[scene,setScene]=useState<Scene|null>(null);
  useLayoutEffect(()=>{if(host.current&&scene)Object.assign(host.current,{galleryScene:scene});},[scene]);
  useLayoutEffect(()=>{
    const root=host.current;if(!root)return;
    const attributes={'aria-expanded':props['aria-expanded'],'aria-selected':props['aria-selected'],'aria-controls':props['aria-controls'],role:props.role};
    if(Object.values(attributes).every(value=>value===undefined)&&props.tabIndex===undefined)return;
    const project=()=>{const button=root.querySelector<HTMLButtonElement>('button[data-control-id]');if(!button)return;
      for(const [key,value] of Object.entries(attributes))if(value!==undefined&&button.getAttribute(key)!==String(value))button.setAttribute(key,String(value));
      if(props.tabIndex!==undefined)button.tabIndex=props.tabIndex;
    };
    project();const observer=new MutationObserver(project);observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
  },[props['aria-expanded'],props['aria-selected'],props['aria-controls'],props.role,props.tabIndex]);
  useLayoutEffect(()=>{
    if(props['aria-label']) {setName(props['aria-label']);return;}
    const label=host.current?.closest('label');
    if(label) setName(label.textContent?.replace(/\s+/g,' ').trim()??'');
  },[props['aria-label']]);
  return <div ref={host} id={props.id} title={props.title} hidden={props.hidden} onKeyDown={props.onKeyDown}
    data-gallery-control={kind} className={`gallery-control gallery-${kind.toLowerCase()} ${props.className??''}`} style={props.style}>
    <SceneView theme={theme} autoHeight autoWidth={fitWidth||['Button','ToggleButton','DropDownButton'].includes(kind)} reducedTransparency={kind==='ComboBox'?undefined:true} onReady={setScene} style={{height:kind==='Expander'?48:32}}>{children(name)}</SceneView>
  </div>;
}
type ValueProps<T> = HostProps & {value?:T;onValueChanged?:(value:T)=>void};
export function GalleryCheckBox({checked=false,onValueChanged,label,horizontalAlignment,...props}:HostProps & {checked?:boolean;label?:ReactNode;horizontalAlignment?:HorizontalAlignment;onValueChanged?:(value:boolean)=>void}) {
  const stretch=horizontalAlignment===HorizontalAlignment.Stretch;
  return <Surface {...props} style={stretch?{...props.style,width:'100%'}:props.style} className={`${props.className??''} ${label?'gallery-labelled':''}`} kind="CheckBox" fitWidth={!!label&&!stretch}>{name=><CheckBox text={textOf(label)} horizontalAlignment={horizontalAlignment} wrap accessibleName={name||textOf(label)} isChecked={checked} enabled={!props.disabled}
    onChecked={()=>{if(!checked)onValueChanged?.(true);}} onUnchecked={()=>{if(checked)onValueChanged?.(false);}}/>}</Surface>;
}
export function GalleryRadioButton({checked=false,onValueChanged,name:group,label,horizontalAlignment,...props}:HostProps & {checked?:boolean;label?:ReactNode;value?:string|number;name?:string;horizontalAlignment?:HorizontalAlignment;onValueChanged?:(value:boolean)=>void}) {
  const stretch=horizontalAlignment===HorizontalAlignment.Stretch;
  return <Surface {...props} style={stretch?{...props.style,width:'100%'}:props.style} className={`${props.className??''} ${label?'gallery-labelled':''}`} kind="RadioButton" fitWidth={!!label&&!stretch}>{name=><RadioButton text={textOf(label)} horizontalAlignment={horizontalAlignment} accessibleName={name||textOf(label)} groupName={group} isChecked={checked} enabled={!props.disabled} onChecked={()=>onValueChanged?.(true)}/>}</Surface>;
}
/** Declarative business data for GalleryComboBox; never mounts a DOM option. */
export function GalleryOption(_props:{children?:ReactNode;value?:string|number;disabled?:boolean}) { return null; }
export function GalleryComboBox({value,children,onValueChanged,fitWidth=false,...props}:HostProps & {value?:string|number;onValueChanged?:(value:string)=>void;children?:ReactNode;fitWidth?:boolean}) {
  const items=Children.toArray(children).filter(isValidElement).map(child=>{
    const option=child as React.ReactElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>;
    return {id:String(option.props.value??textOf(option.props.children)),text:textOf(option.props.children),enabled:!option.props.disabled};
  });
  return <Surface {...props} kind="ComboBox" fitWidth={fitWidth}>{name=><ComboBox accessibleName={name} items={items} selectedIndex={items.findIndex(item=>item.id===String(value))}
    enabled={!props.disabled} horizontalAlignment={fitWidth?HorizontalAlignment.Left:HorizontalAlignment.Stretch} onSelectionChanged={event=>{
      const item=items[event.selectedIndex??-1];if(item&&item.id!==String(value))onValueChanged?.(item.id);
    }}/>}</Surface>;
}
export function GalleryNumberBox({value,min,max,step,onValueChanged,...props}:HostProps & {value?:number|string;onValueChanged?:(value:number)=>void;min?:number|string;max?:number|string;step?:number|string}) {
  return <Surface {...props} kind="NumberBox">{name=><NumberBox accessibleName={name} value={Number(value)} minimum={min===undefined?undefined:Number(min)} maximum={max===undefined?undefined:Number(max)}
    smallChange={step===undefined?undefined:Number(step)} enabled={!props.disabled} horizontalAlignment={HorizontalAlignment.Stretch}
    onValueChanged={event=>{if(event.newValue!=null&&event.newValue!==Number(value))onValueChanged?.(event.newValue);}}/>}</Surface>;
}
export function GallerySlider({value,min=0,max=100,step=1,onValueChanged,...props}:HostProps & {value?:number|string;onValueChanged?:(value:number)=>void;min?:number|string;max?:number|string;step?:number|string}) {
  return <Surface {...props} kind="Slider">{name=><Slider accessibleName={name} value={Number(value)} minimum={Number(min)} maximum={Number(max)} stepFrequency={Number(step)} enabled={!props.disabled}
    horizontalAlignment={HorizontalAlignment.Stretch} onValueChanged={event=>{if(event.value!==undefined&&event.value!==Number(value))onValueChanged?.(event.value);}}/>}</Surface>;
}
export function GalleryTextBox({value='',placeholder,onValueChanged,ref:controlRef,...props}:ValueProps<string> & {placeholder?:string;ref?:Ref<TextBoxController>}) {
  return <Surface {...props} kind="TextBox">{name=><TextBox text={value} placeholderText={placeholder} accessibleName={name} enabled={!props.disabled} horizontalAlignment={HorizontalAlignment.Stretch}
    onReady={control=>{if(typeof controlRef==='function')controlRef(control);else if(controlRef)controlRef.current=control;}}
    onTextChanged={event=>{if(event.text!==undefined&&event.text!==value)onValueChanged?.(event.text);}}/>}</Surface>;
}
export function GallerySearchBox({value,placeholder,items,onValueChanged,onQuerySubmitted,ref:controlRef,...props}:ValueProps<string> & {placeholder:string;items:readonly CollectionItem[];onQuerySubmitted:(event:ComposedEvent)=>void;ref?:Ref<SearchController>}) {
  return <Surface {...props} kind="AutoSuggestBox">{name=><AutoSuggestBox accessibleName={name} text={value} placeholderText={placeholder} queryIcon items={items}
    isSuggestionListOpen={!!value?.trim()} updateTextOnSelect={false} horizontalAlignment={HorizontalAlignment.Stretch}
    onReady={control=>{if(typeof controlRef==='function')controlRef(control);else if(controlRef)controlRef.current=control;}}
    onTextChanged={event=>{if(event.text!==undefined&&event.text!==value)onValueChanged?.(event.text);}} onQuerySubmitted={onQuerySubmitted}/>}</Surface>;
}
type ActionProps=HostProps & {children?:ReactNode;onClick?:()=>void;iconOnly?:boolean;width?:number;height?:number;minWidth?:number;glyphSize?:number;variant?:ButtonVariant;'aria-pressed'?:boolean;'aria-expanded'?:boolean;'aria-selected'?:boolean;'aria-controls'?:string;role?:string;tabIndex?:number};
function ButtonContent({children,glyphSize=16}:{children:ReactNode;glyphSize?:number}) {
  const tokens=Children.toArray(children);
  return <StackPanel orientation={Orientation.Horizontal} spacing={8} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}>
    {tokens.map((token,index)=>{
      if(isValidElement<{glyph?:string;children?:ReactNode;className?:string}>(token)) {
        const glyph=token.props.glyph??(typeof token.props.children==='string'&&/^[\uE000-\uF8FF]$/.test(token.props.children)?token.props.children:undefined);
        if(glyph)return <FontIcon key={index} glyph={glyph} fontSize={glyphSize}/>;
      }
      const text=textOf(token);return text?<TextBlock key={index} text={text}/>:null;
    })}
  </StackPanel>;
}
export function GalleryButton({children,onClick,iconOnly=false,width=40,height=32,minWidth,glyphSize=16,variant=ButtonVariant.Standard,...props}:ActionProps) {
  const selected=props['aria-pressed']??props['aria-selected']??props.className?.split(' ').includes('active');
  const toggle=props['aria-pressed']!==undefined||props.role==='tab'||props.className?.includes('active');
  return <Surface {...props} className={`${props.className??''} ${iconOnly?'gallery-icon-action':''}`} style={iconOnly?{...props.style,width,height}:props.style} kind={toggle?'ToggleButton':'Button'}>{name=>{
    const options={minWidth,accessibleName:name||textOf(children),enabled:!props.disabled,onClick:()=>onClick?.(),horizontalAlignment:HorizontalAlignment.Stretch,
      ...(iconOnly?{width,height,minWidth:0,minHeight:0,padding:[0,0,0,0] as [number,number,number,number]}:{})};
    return toggle?<ToggleButton {...options} isChecked={!!selected}><ButtonContent glyphSize={glyphSize}>{children}</ButtonContent></ToggleButton>
      :<Button {...options} variant={variant}><ButtonContent glyphSize={glyphSize}>{children}</ButtonContent></Button>;
  }}</Surface>;
}
/** Source text stays DOM content. The existing Expander owns header input/state. */
export function GalleryExpanderHeader(_props:{children?:ReactNode}) {return null;}
export function GalleryExpander({children,open=false,...props}:HostProps & {children?:ReactNode;open?:boolean}) {
  const [expanded,setExpanded]=useState(open);
  const [initialized,setInitialized]=useState(open);
  const [control,setControl]=useState<ExpanderController|null>(null);
  const [content]=useState(()=>document.createElement('div'));
  useLayoutEffect(()=>{if(control&&!control.isDisposed)return control.setContentHost(content);},[control,content]);
  const all=Children.toArray(children), header=all.find(child=>isValidElement(child)&&child.type===GalleryExpanderHeader);
  return <div className={props.className} id={props.id} data-gallery-expander="" data-expanded={expanded}>
    <Surface kind="Expander" aria-label={textOf(header)}>{name=><Expander header={name} isExpanded={expanded} horizontalAlignment={HorizontalAlignment.Stretch} horizontalContentAlignment={HorizontalAlignment.Stretch} verticalContentAlignment={VerticalAlignment.Top}
      onReady={setControl} onExpanding={()=>{setInitialized(true);setExpanded(true);}} onCollapsed={()=>setExpanded(false)}/>}</Surface>
    {initialized&&createPortal(all.filter(child=>child!==header),content)}
  </div>;
}
export function GalleryMenu({label,items,...props}:HostProps & {label:string;items:{id:string;text:string;invoke:()=>void}[]}) {
  return <Surface {...props} kind="DropDownButton">{name=>
    <DropDownButton accessibleName={name||label} text={label}>
      <DropDownButton.Flyout><MenuFlyout placement={OverlayPlacement.BottomEdgeAlignedLeft} menuItems={items.map(({id,text})=>({id,text}))}
        onItemInvoked={event=>items.find(item=>item.id===event.itemId)?.invoke()}/></DropDownButton.Flyout>
    </DropDownButton>
  }</Surface>;
}
export function GalleryInformation({title,lines,...props}:HostProps & {title:string;lines:string[]}) {
  return <Surface {...props} kind="Button">{name=>
    <Button accessibleName={name||title} width={24} height={24} minWidth={0} minHeight={0} padding={[4,4,4,4]} variant={ButtonVariant.Subtle}>
      <FontIcon glyph={'\uE946'} fontSize={14}/>
      <Button.Flyout><Flyout width={360} placement={OverlayPlacement.BottomEdgeAlignedLeft}>
        <StackPanel spacing={8}>{lines.map((text,index)=><TextBlock key={index} text={text} wrap/>)}</StackPanel>
      </Flyout></Button.Flyout>
    </Button>
  }</Surface>;
}

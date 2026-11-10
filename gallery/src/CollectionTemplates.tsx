import{Grid,StackPanel,TextBlock,Ellipse,Image}from'winui-wasm/react';
import{GridUnit,HorizontalAlignment,VerticalAlignment,Orientation,ImageStretch,TextTrimming,OpticalMarginAlignment}from'winui-wasm';
import data from'./collections-data.json';
export type Contact=typeof data.contacts[number];
export type Photo=typeof data.photos[number];
export type PhotoTemplate='ImageTemplate'|'ImageOverlayTemplate'|'IconTextTemplate'|'ImageTextTemplate'|'TextTemplate';
/** ContactListViewTemplate from the pinned Gallery; the native probe uses the original XAML. */
export function ContactTemplate({contact}:{contact:Contact}){return<Grid rows={[{unit:GridUnit.Star,value:1},{unit:GridUnit.Star,value:1}]} columns={[{unit:GridUnit.Auto},{unit:GridUnit.Star,value:1}]}>
 <Ellipse width={32} height={32} margin={[6,6,6,6]} rowSpan={2} background={{resource:'ControlStrongFillColorDefaultBrush'}} horizontalAlignment={HorizontalAlignment.Center} verticalAlignment={VerticalAlignment.Center}/>
 <TextBlock column={1} text={contact.text} fontWeight={600} wrap margin={[12,6,0,0]}/><TextBlock column={1} row={1} text={contact.company} margin={[12,0,0,6]}/>
</Grid>;}
/** Literal Gallery DataTemplate ports; layout and image sizing are executed by Rust. */
export function PhotoItem({item,template='ImageTemplate'}:{item:Photo;template?:PhotoTemplate}){
 if(template==='ImageOverlayTemplate')return<Grid width={100}>
  <Image source={item.image} stretch={ImageStretch.UniformToFill}/>
  <StackPanel height={40} padding={[5,1,5,1]} verticalAlignment={VerticalAlignment.Bottom} background={{resource:'SystemControlBackgroundBaseMediumBrush'}} opacity={.75}>
   <TextBlock text={item.text} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/>
   <StackPanel orientation={Orientation.Horizontal}><TextBlock text={item.likes} fontSize={12} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/><TextBlock text=" Likes" fontSize={12} foreground={{resource:'SystemControlForegroundAltHighBrush'}}/></StackPanel>
  </StackPanel>
 </Grid>;
 if(template==='TextTemplate')return<StackPanel width={240} orientation={Orientation.Horizontal}><TextBlock text={item.text} fontSize={28} fontWeight={600} opticalMarginAlignment={OpticalMarginAlignment.TrimSideBearings} margin={[8,0,0,0]}/></StackPanel>;
 if(template==='ImageTextTemplate')return<Grid width={280} columns={[{unit:GridUnit.Auto},{unit:GridUnit.Star,value:1}]}>
  <Image source={item.image} height={100} verticalAlignment={VerticalAlignment.Top} stretch={ImageStretch.Fill}/>
  <StackPanel column={1} margin={[8,0,0,8]}><TextBlock text={item.text} fontSize={20} fontWeight={600} opticalMarginAlignment={OpticalMarginAlignment.TrimSideBearings} margin={[0,0,0,8]}/><TextBlock text={item.views+' Views '} fontSize={12}/><TextBlock text={item.likes+' Likes'} fontSize={12}/></StackPanel>
 </Grid>;
 if(template==='IconTextTemplate')return<Grid width={280} minHeight={160} rows={[{unit:GridUnit.Auto},{unit:GridUnit.Star,value:1}]} columns={[{unit:GridUnit.Pixel,value:26},{unit:GridUnit.Star,value:1}]}>
  <Image source={item.image} width={18} margin={[0,4,0,0]} horizontalAlignment={HorizontalAlignment.Left} verticalAlignment={VerticalAlignment.Top} stretch={ImageStretch.Uniform}/>
  <TextBlock text={item.text} column={1} fontWeight={600} wrap/>
  <TextBlock text={item.description} row={1} columnSpan={2} margin={[0,4,8,0]} fontSize={12} wrap trimming={TextTrimming.WordEllipsis}/>
 </Grid>;
 return<Image source={item.image} width={190} height={130} stretch={ImageStretch.UniformToFill}/>;
}

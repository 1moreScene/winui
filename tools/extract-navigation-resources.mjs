import { readFileSync,writeFileSync } from 'node:fs';
const palette=JSON.parse(readFileSync(new URL('../out/navigation-native/palettes.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../references/winui/NavigationView_themeresources.xaml',import.meta.url),'utf8');
const aliases={};
for(const [name,key] of [['Light','Light'],['Dark','Default'],['HighContrast','HighContrast']]){
  const body=source.match(new RegExp(`<ResourceDictionary x:Key="${key}">([\\s\\S]*?)</ResourceDictionary>`))?.[1];
  if(!body)throw Error(`theme ${key} missing`);
  aliases[name]=Object.fromEntries([...body.matchAll(/<StaticResource x:Key="([^"]+)" ResourceKey="([^"]+)"/g)].map(m=>[m[1],m[2]]));
}
palette.HighContrast={};
const high={TextFillColorPrimaryBrush:'#ffffffff',TextFillColorSecondaryBrush:'#ffffffff',TextFillColorDisabledBrush:'#7fff00ff',SubtleFillColorSecondaryBrush:'#1aebffff',SubtleFillColorTertiaryBrush:'#ffff00ff',DividerStrokeColorDefaultBrush:'#ffffffff',CardStrokeColorDefaultBrush:'#ffffffff',LayerFillColorDefaultBrush:'#000000ff',AccentFillColorDefaultBrush:'#ffff00ff'};
for(const [key,color]of Object.entries(high))palette.HighContrast[key]={kind:'solid',color};
// System colors are host inputs. Deterministic fallback is declared, never silently ignored.
for(const theme of Object.keys(palette)){
  palette[theme].SubtleFillColorTransparentBrush={kind:'solid',color:'#00000000'};
  palette[theme].SystemControlTransparentBrush={kind:'solid',color:'#00000000'};
  palette[theme].SolidBackgroundFillColorTransparent={kind:'solid',color:'#00000000'};
}
for(const key of Object.keys(aliases.HighContrast)){
  const fallback=/Indicator|Selected|PointerOver/.test(key)?'AccentFillColorDefaultBrush':/Background/.test(key)?'LayerFillColorDefaultBrush':'TextFillColorPrimaryBrush';
  aliases.HighContrast[key]=fallback;
}
for(const key of ['NavigationViewContentBackground','NavigationViewSelectionIndicatorForeground','NavigationViewItemForeground','NavigationViewItemForegroundDisabled','NavigationViewItemBackgroundSelected','NavigationViewItemBackgroundPointerOver','NavigationViewItemBackgroundPressed','NavigationViewItemSeparatorForeground','NavigationViewContentGridBorderBrush'])
  if(!aliases.HighContrast[key])aliases.HighContrast[key]=aliases.Light[key];
writeFileSync(new URL('../references/navigation-resources.json',import.meta.url),JSON.stringify({sourceCommit:'7b12709347527238494ca28cb9fed326d513e779',sdk:'Microsoft.WindowsAppSDK.WinUI 2.3.10-experimental',source:'NavigationView_themeresources.xaml aliases plus native SDK ThemeResource probe',highContrast:'Explicit host fallback; custom OS colors not captured',aliases,primitives:palette},null,2)+'\n');

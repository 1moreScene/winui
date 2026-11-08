import { readFileSync,writeFileSync } from 'node:fs';
const records=JSON.parse(readFileSync(new URL('../out/navigation-native/metrics.json',import.meta.url),'utf8'));
const names=new Set(['TogglePaneButton','NavigationViewBackButton','HeaderContent','PaneRoot','ContentGrid','SettingsItem','LayoutRoot']);
const summary=records.map(record=>({name:record.name,displayMode:record.displayMode,isPaneOpen:record.isPaneOpen,
  parts:record.parts.filter(p=>(names.has(p.name)&&p.bounds.height>36)||p.type==='NavigationViewItem'||(p.type==='TextBlock'&&p.text==='Sample Page 1')).map(p=>({name:p.name,type:p.type,text:p.text,bounds:p.bounds,background:p.background}))}));
writeFileSync(new URL('../out/navigation-native/summary.json',import.meta.url),JSON.stringify(summary,null,2));
for(const row of summary.filter(r=>r.name.startsWith('Light')))console.log(row.name,JSON.stringify(row.parts.filter(p=>p.type==='NavigationViewItem'||['HeaderContent','TogglePaneButton','ContentGrid','PaneRoot'].includes(p.name))));

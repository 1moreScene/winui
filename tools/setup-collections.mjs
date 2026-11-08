import{readFileSync,writeFileSync}from'node:fs';
const path='references/api-enums.json',d=JSON.parse(readFileSync(path,'utf8'));
for(const name of ['ItemsStackPanel','ItemsWrapGrid','VariableSizedWrapGrid','ListView','GridView','CollectionItem'])d.NodeKind.members[name]=[name, name==='CollectionItem'?'Rust-owned realized item container; lifecycle belongs to its collection.':`Native ${name} layout/control slice.`];
for(const name of ['ItemClick','RealizationChanged'])d.EventKind.members[name]=[name,name==='ItemClick'?'Collection item primary invocation; fires before user selection updates.':'Realized container set changed; used by host templates.'];
d.ListViewSelectionMode={rust:'ListViewSelectionMode',description:'Collection selection policy. Default Single.',default:'Single',members:{None:['None','Focus and optional ItemClick, without selection.'],Single:['Single','Keep at most one selected item.'],Multiple:['Multiple','Toggle independent items.'],Extended:['Extended','Support Ctrl toggles and Shift range selection.']}};
writeFileSync(path,JSON.stringify(d,null,2)+'\n');

import{readFileSync,writeFileSync}from'node:fs';
const path=new URL('../references/api-enums.json',import.meta.url),s=JSON.parse(readFileSync(path,'utf8'));
for(const [name,description]of Object.entries({InfoBar:'Inline notification with cancellable close and action/content slots.',PersonPicture:'Circular profile picture, initials/group fallback and badge.',RatingControl:'Interactive nullable rating with placeholder, caption and pointer/keyboard input.',SplitButton:'Primary action with a separate flyout button.',ToggleSplitButton:'Checked primary action with a separate flyout button.'}))s.NodeKind.members[name]=[name,description];
for(const [name,description]of Object.entries({CloseButtonClick:'InfoBar close button invoked before its cancellable Closing event.',IsCheckedChanged:'ToggleSplitButton checked state changed before Click.'}))s.EventKind.members[name]=[name,description];
for(const [name,values,description]of [
 ['InfoBarSeverity',['Informational','Success','Warning','Error'],'Notification color and icon. Default Informational.'],
 ['InfoBarCloseReason',['CloseButton','Programmatic'],'Cause of a notification close request.'],
 ['RatingItemKind',['Font','Image'],'Rating item descriptor type. Default Font.'],
])s[name]={rust:name,description,members:Object.fromEntries(values.map(v=>[v,[v,v+' '+description]])),default:values[0]};
writeFileSync(path,JSON.stringify(s,null,2)+'\n');

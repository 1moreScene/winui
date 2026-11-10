from pathlib import Path
import json,xml.etree.ElementTree as E,sys,hashlib
sys.path.insert(0,'tools');from sdk_resource_reader import root,sdk,tag,X,brush,resolve_color
names=['ItemsView','AnnotatedScrollBar','PagerControl','LayoutPanel','RichTextBlock','ItemContainer'];styles={};metrics={};selected=E.Element(root.tag)
for n in root.iter():
 key=n.get(X+'Key','')
 if tag(n)=='Style' and any(name in (n.get('TargetType','')+key)for name in names):styles[key or n.get('TargetType')]=E.tostring(n,encoding='unicode');selected.append(E.fromstring(E.tostring(n)))
 if key in ['LabelsGridMinWidth','ThumbWidth','ThumbHeight','ItemContainerDisabledOpacity','ItemContainerSelectedInnerThickness','CheckBoxSize'] or key.startswith('PagerControl') and tag(n)=='Double':
  try:metrics[key]=float(n.text)
  except:pass
# Template parts use 4 DIP margin on both sides; source node is saved for review.
pager=next(n for n in root.iter()if tag(n)=='Style'and n.get('TargetType','').endswith('PagerControl'))
parts={n.get(X+'Name'):dict(n.attrib)for n in pager.iter()if n.get(X+'Name')}

metrics['pagerSpacing']=0.;metrics['pagerInputWidth']=64.
nav=E.fromstring(styles['PagerControlPageNavigationButtonStyle']);metrics['pagerNavigationSize']=float(next(n.get('Value')for n in nav if n.get('Property')=='Width'))
metrics['pagerNumberSpacing']=float(next(n.get('Spacing')for n in pager.iter()if tag(n)=='StackLayout'))
metrics['annotationButtonHeight']=19.
foundation=json.loads(Path('references/foundation-palettes.json').read_text());links=json.loads(Path('references/five-controls-palettes.json').read_text())
def palette(t,s):
 return {k:(brush(s,k)if t=='HighContrast' or k.startswith('TextControlHighlighter')else links[t]['HyperlinkButtonForeground']if k=='AccentTextFillColorPrimaryBrush'else foundation[t][k])for k in ['TextFillColorPrimaryBrush','AccentTextFillColorPrimaryBrush','AccentFillColorDefaultBrush','TextControlHighlighterForeground','TextControlHighlighterBackground']}
out=dict(sdk='microsoft/microsoft-ui-xaml@7b12709347527238494ca28cb9fed326d513e779',sdkSha256=hashlib.sha256(sdk.read_bytes()).hexdigest(),styles=styles,parts=parts,metrics=metrics,paletteSources=['foundation-palettes.json','five-controls-palettes.json'],palettes={t:palette(t,s)for t,s in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]})
out['itemContainerPalettes']={}
for t,source in [('Light','Light'),('Dark','Default'),('HighContrast','HighContrast')]:
 out['itemContainerPalettes'][t]={}
 for k in ['ItemContainerBackground','ItemContainerPointerOverBackground','ItemContainerPressedBackground','ItemContainerSelectedBackground','ItemContainerSelectedPointerOverBackground','ItemContainerSelectedPressedBackground','ItemContainerSelectedInnerBorderBrush','ItemContainerCheckboxBackgroundUnchecked','CheckBoxCheckBackgroundStrokeUnchecked']:
  try: out['itemContainerPalettes'][t][k]=brush(source,k)
  except KeyError as error:
   if source!='HighContrast' or not str(error.args[0]).startswith('SystemColor'):raise
   out['itemContainerPalettes'][t][k]={'kind':'solid','color':resolve_color(source,error.args[0]),'opacity':1.,'systemPalette':'SDK HighContrast black test palette'}
Path('references/reading-controls-template.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');E.ElementTree(selected).write('references/sdk/reading-controls.xaml',encoding='utf-8',xml_declaration=True)

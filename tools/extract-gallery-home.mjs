// Homepage metadata and artwork from the project's pinned, MIT-licensed Gallery.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reference = resolve(process.argv[2] ?? resolve(root, '../WinUI-Gallery'));
const commit = '7360ac322414e118eadfb0c7c2f4ecc31a218f59';
if (execFileSync('git', ['-C', reference, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== commit)
  throw new Error(`Expected the pinned Gallery commit ${commit}`);
const sourceRoot = resolve(reference, 'WinUIGallery');
const source = 'SampleSupport/Data/ControlInfoData.json';
const data = JSON.parse(readFileSync(resolve(sourceRoot, source), 'utf8'));
const scope = JSON.parse(readFileSync(resolve(root, 'references/scope.json'), 'utf8'));
const output = resolve(root, 'gallery/public/official/home');
mkdirSync(output, { recursive: true });
const fingerprints = [];
function asset(path) {
  const file = resolve(sourceRoot, path);
  const destination = resolve(output, path);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(file, destination);
  fingerprints.push({ path, sha256: createHash('sha256').update(readFileSync(file)).digest('hex') });
  return `/official/home/${path}`;
}
const images = new Map();
const groups = data.Groups.map(group => ({
  id: group.UniqueId, title: group.Title, special: group.IsSpecialSection ?? false,
  icon: ({ FundamentalsItem: '\uE8F1', DesignItem: '\uEB3C', AccessibilityItem: '\uE776' })[group.UniqueId] ?? group.IconGlyph,
  items: group.Items.map(item => {
    const path = item.ImagePath.replace('ms-appx:///', '');
    if (!images.has(path)) images.set(path, asset(path));
    const page = scope.controls.find(control => control.id === item.UniqueId.toLowerCase())?.galleryPage ?? '';
    return { id: item.UniqueId, title: item.Title, subtitle: item.Subtitle ?? '',
      description: item.Description ?? item.Subtitle ?? '', image: images.get(path),
      namespace: item.ApiNamespace ?? '', baseClasses: item.BaseClasses ?? [], sourcePath: item.SourcePath ?? '',
      samplePage: page && existsSync(resolve(reference, page)) ? page : '',
      isNew: item.IsNew ?? false, isUpdated: item.IsUpdated ?? false,
      experimental: item.IsExperimental ?? false,
      tags: item.Tags ?? [], docs: item.Docs ?? [] };
  }),
}));
for (const path of ['Assets/GalleryHeaderImage.png', 'Assets/Tiles/AppList.targetsize-32.png',
  'Assets/HomeHeaderTiles/Header-WinUI.png', 'Assets/HomeHeaderTiles/Header-WindowsDesign.png',
  'Assets/HomeHeaderTiles/Header-Toolkit.png', 'Assets/HomeHeaderTiles/Header-Store.light.png',
  'Assets/HomeHeaderTiles/Header-Store.dark.png']) asset(path);
copyFileSync(resolve(reference, 'LICENSE'), resolve(output, 'LICENSE.txt'));
writeFileSync(resolve(root, 'gallery/src/official-home.json'), JSON.stringify({ commit, groups }, null, 2) + '\n');
const sources = [source, 'Pages/HomePage.xaml', 'Pages/HomePage.xaml.cs', 'Controls/HomePage/HomePageHeader.xaml',
  'Controls/HomePage/Tile.xaml', 'Controls/HorizontalScrollContainer.xaml', 'Controls/HorizontalScrollContainer.xaml.cs', 'Styles/ItemTemplates.xaml',
  'Styles/GridViewItem.xaml', 'Styles/SelectorBar.xaml', 'App.xaml', 'MainWindow.xaml', 'MainWindow.xaml.cs',
  'Pages/ItemPage.xaml', 'Controls/PageHeader.xaml', 'Controls/ControlExample.xaml', 'Controls/SampleCodePresenter.xaml', 'Styles/Grid.xaml'];
writeFileSync(resolve(root, 'references/home-source.json'), JSON.stringify({
  repository: 'https://github.com/microsoft/WinUI-Gallery', commit, license: 'MIT',
  generator: relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/'),
  sources: sources.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(resolve(sourceRoot, path))).digest('hex') })),
  assets: fingerprints,
}, null, 2) + '\n');
console.log(`Extracted ${groups.length} groups, ${groups.flatMap(g => g.items).length} samples and ${fingerprints.length} assets.`);

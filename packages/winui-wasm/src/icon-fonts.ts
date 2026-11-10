const iconFontUrl = new URL('./assets/winui-icons.woff', import.meta.url).href;

let ready: Promise<void> | undefined;
/** 加载开源替代字体；Windows 通过独立别名引用本机字体，不覆盖系统字体名称。 */
export function loadIconFonts(): Promise<void> {
  return ready ??= (async () => {
    const portable = new FontFace('WinUI Portable Icons', `url("${iconFontUrl}") format("woff")`);
    await portable.load();
    document.fonts.add(portable);
    const platform = (navigator as Navigator & {userAgentData?: {platform?: string}}).userAgentData?.platform ?? navigator.platform;
    if (!/^win/i.test(platform)) return;
    await Promise.all([
      ['WinUI Native Fluent Icons', 'Segoe Fluent Icons'],
      ['WinUI Native MDL2 Icons', 'Segoe MDL2 Assets'],
    ].map(async ([alias, native]) => {
      const face = new FontFace(alias, `local("${native}")`);
      try {
        await face.load();
      } catch {
        // 系统未安装、浏览器禁用本地字体时，保留已加载的开源回退字体。
        return;
      }
      document.fonts.add(face);
    }));
  })().catch(error => {ready = undefined; throw error;});
}

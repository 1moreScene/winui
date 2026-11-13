import { useState } from 'react';
import { SceneView, ContentDialog, StackPanel, TextBlock, TextBox, ComboBox } from 'winui-wasm/react';
import { ContentDialogButton, HorizontalAlignment, RendererBackend, ThemeMode } from 'winui-wasm';
import { reactSource, type DesignDocument } from './model';

export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExportDialog({ document, onClose, onNotice }: { document: DesignDocument; onClose: () => void; onNotice: (notice: string) => void }) {
  const [type, setType] = useState('react');
  const source = type === 'react' ? reactSource(document) : JSON.stringify(document, null, 2);
  const filename = (document.name || 'page').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  return <div className="export-modal" data-designer-ui="ContentDialog">
    <SceneView theme={ThemeMode.Light} backend={RendererBackend.Canvas2D} style={{ width: '100%', height: '100%' }}>
      <ContentDialog title="导出设计" primaryButtonText="下载文件" secondaryButtonText="复制" closeButtonText="关闭导出" defaultButton={ContentDialogButton.Primary}
        onReady={control => { void control.showAsync(); }} onClosed={onClose}
        onPrimaryButtonClick={event => { event.cancel = true; download(source, `${filename}.${type === 'react' ? 'tsx' : 'json'}`, type === 'react' ? 'text/plain;charset=utf-8' : 'application/json'); }}
        onSecondaryButtonClick={event => { event.cancel = true; void navigator.clipboard.writeText(source).then(() => onNotice('已复制到剪贴板')).catch(() => onNotice('复制失败，请使用下载按钮')); }}>
        <StackPanel spacing={14} horizontalAlignment={HorizontalAlignment.Stretch}>
          <TextBlock text="导出 React 组件，或保存可继续编辑的设计文件。" wrap />
          <ComboBox accessibleName="导出格式" horizontalAlignment={HorizontalAlignment.Stretch} items={[{ id: 'react', text: 'React / TSX' }, { id: 'json', text: '设计文件 / JSON' }]} selectedIndex={type === 'react' ? 0 : 1} onSelectionChanged={event => setType(event.selectedIndex === 1 ? 'json' : 'react')} />
          <TextBox accessibleName="导出内容" text={source} isReadOnly acceptsReturn height={360} horizontalAlignment={HorizontalAlignment.Stretch} />
          <TextBlock text={type === 'react' ? '使用 winui-wasm/react 公共组件，需挂载到 WinUIProvider。' : 'JSON 保留全部设计属性，可以重新导入。'} wrap />
        </StackPanel>
      </ContentDialog>
    </SceneView>
  </div>;
}

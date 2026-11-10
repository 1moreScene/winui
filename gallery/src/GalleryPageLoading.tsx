import { ProgressRing, SceneView } from 'winui-wasm/react';
import { useGalleryTheme } from './gallery-theme';

/** The page bundle loads asynchronously; the existing Rust control draws and animates its indicator. */
export function GalleryPageLoading() {
  const [theme] = useGalleryTheme();
  return <div className="gallery-page-loading" role="status" aria-label="Loading page" aria-busy="true">
    <SceneView theme={theme} style={{ width: 32, height: 32 }}>
      <ProgressRing width={32} height={32} isActive isIndeterminate accessibleName="Loading page" />
    </SceneView>
  </div>;
}

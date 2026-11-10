import { LocalizedText } from "./GalleryLanguage";
import { useEffect, useState } from "react";
import { type WinUI } from "winui-wasm";
import { GalleryCheckBox } from "./GalleryControls";
import { NavigationGalleryExample } from "./NavigationGalleryExample";
import { NavigationFrameExample } from "./NavigationFrameExample";
import { exampleNames } from "./examples";
import { useGalleryTheme } from "./gallery-theme";

export function NavigationPage({ sdk }: { sdk: WinUI }) {
  const [controlCount, setControlCount] = useState(0);
  const [theme, setTheme] = useGalleryTheme();
  const [reducedMotion, setReducedMotion] = useState(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reducedTransparency, setReducedTransparency] = useState(
    matchMedia("(prefers-reduced-transparency: reduce)").matches,
  );
  useEffect(() => {
    setControlCount(sdk.liveCount);
    window.gallery.appReadyMs = performance.now();
  }, [sdk]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <main id="overview">
        <div className="page-toolbar">
          <span className="implementation-badge">
            <span className="status-dot" />
            Rust-owned controls
          </span>
          <div className="preferences">
            <GalleryCheckBox
                id="motion"
                
                checked={reducedMotion}
                onValueChanged={(e) => setReducedMotion(e)}  label={<>
              
              Reduce motion
            </>}/>
            <GalleryCheckBox
                id="transparency"
                
                checked={reducedTransparency}
                onValueChanged={(e) =>
                  setReducedTransparency(e)
                }  label={<>
              
              Reduce transparency
            </>}/>
          </div>
        </div>
        <div id="samples">
          {exampleNames.map((name, index) => (
            <NavigationGalleryExample
              key={name}
              sdk={sdk}
              index={index}
              theme={theme}
              reducedMotion={reducedMotion}
              reducedTransparency={reducedTransparency}
              hidden={false}
            />
          ))}
          <NavigationFrameExample theme={theme} reducedMotion={reducedMotion} reducedTransparency={reducedTransparency}/>
        </div>
        <section id="baseline" className="baseline">
          <h2><LocalizedText>Implementation baseline</LocalizedText></h2>
          <p><LocalizedText>
            Official Gallery{" "}
            <code>7360ac322414e118eadfb0c7c2f4ecc31a218f59</code>
            <br />
            Windows App SDK <code>2.5.4-experimental</code> → WinUI{" "}
            <code>2.3.10-experimental</code>
            <br />
            WinUI source tag <code>
              winui3/release/2.5.4-experimental
            </code> · <code>7b127093</code>
          </LocalizedText></p>
          <p><LocalizedText>
            React mounts {controlCount} real Rust controls through the public
            SDK. Native template composition, acrylic, top overflow measurement
            and full accessibility parity are tracked separately in the
            repository documentation. Button and shared-scene foundations are
            available in the sidebar. Other full Gallery controls, Charts and
            community TableView remain outside this batch.
          </LocalizedText></p>
        </section>
        <footer>
          WinUI Rust Gallery<span>NavigationView · v0.1.0</span>
        </footer>
      </main>
    </>
  );
}


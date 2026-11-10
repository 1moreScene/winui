import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { ThemeMode } from 'winui-wasm';

type GalleryTheme = [ThemeMode, Dispatch<SetStateAction<ThemeMode>>];
export const GalleryThemeContext = createContext<GalleryTheme | null>(null);

export function initialGalleryTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('winui-gallery.theme');
    if (Object.values(ThemeMode).includes(saved as ThemeMode)) return saved as ThemeMode;
  } catch { /* Use the system preference when storage is unavailable. */ }
  return matchMedia('(forced-colors: active)').matches ? ThemeMode.HighContrast
    : matchMedia('(prefers-color-scheme: dark)').matches ? ThemeMode.Dark : ThemeMode.Light;
}

/** One theme across the Gallery shell and all Rust sample pages. */
export function useGalleryTheme(): GalleryTheme {
  const shared = useContext(GalleryThemeContext);
  const local = useState(initialGalleryTheme);
  return shared ?? local;
}

import *as SDK from 'winui-wasm';
(window as unknown as {readingSDK:typeof SDK}).readingSDK=SDK;
import {createReadingGalleryFixture} from './reading-gallery-fixture';
(window as unknown as {createReadingGalleryFixture:typeof createReadingGalleryFixture}).createReadingGalleryFixture=createReadingGalleryFixture;

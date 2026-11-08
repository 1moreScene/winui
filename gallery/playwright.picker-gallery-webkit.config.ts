import {defineConfig} from '@playwright/test';
import base from './playwright.picker-gallery.config';
export default defineConfig({...base,outputDir:'../out/picker-gallery-webkit-artifacts',use:{...base.use,channel:undefined,browserName:'webkit'},reporter:[['list'],['json',{outputFile:'../out/picker-gallery-webkit-results.json'}]]});

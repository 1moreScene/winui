import base from './playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,outputDir:'../out/overlays-browser/artifacts',reporter:[['list'],['json',{outputFile:'../out/overlays-browser/results.json'}]]});

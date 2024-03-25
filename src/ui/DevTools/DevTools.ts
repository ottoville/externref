//@ts-expect-error https://github.com/microsoft/TypeScript/issues/46135
import sheet from '/css/DevTools.css' with { type: 'css' };
import { DevToolsApp } from './DevToolsApp.js';
document.adoptedStyleSheets = [sheet];

export const DevTools = DevToolsApp;

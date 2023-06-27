//@ts-expect-error
// eslint-disable-next-line import/extensions
import sheet from '/css/DevTools.css' assert { type: 'css' };
import { DevToolsApp } from './DevToolsApp.js';
document.adoptedStyleSheets = [sheet];

export const DevTools = DevToolsApp
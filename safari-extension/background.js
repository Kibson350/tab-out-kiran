/**
 * background.js — Service Worker (Safari)
 */

const _api = typeof browser !== 'undefined' ? browser : chrome;

_api.runtime.onInstalled.addListener(() => {});
_api.runtime.onStartup.addListener(() => {});

// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable WASM support for expo-sqlite on web (wa-sqlite)
config.resolver.assetExts.push('wasm');

// Resolve @medcode/* path aliases (mirrors tsconfig.json paths)
config.resolver.extraNodeModules = {
  '@medcode/core': path.resolve(__dirname, 'packages/core/src'),
  '@medcode/search': path.resolve(__dirname, 'packages/search/src'),
};

// Watch the packages/ directory for hot-reload
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, 'packages'),
];

// SheetJS's Node entry pulls in fs/stream. The browser build is what the PWA bundles.
const sheetBrowserBuild = path.resolve(__dirname, 'node_modules/xlsx/dist/xlsx.full.min.js');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'xlsx' || moduleName === 'xlsx/dist/xlsx.full.min.js') {
    return { filePath: sheetBrowserBuild, type: 'sourceFile' };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

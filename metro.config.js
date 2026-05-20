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

module.exports = config;

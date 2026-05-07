// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable WASM support for expo-sqlite on web (wa-sqlite)
config.resolver.assetExts.push('wasm');

module.exports = config;

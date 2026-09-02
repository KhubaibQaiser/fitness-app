// @ts-check
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Keep hierarchical lookup so pnpm's nested .pnpm store remains reachable
// from requiring packages (expo → expo-modules-core, etc.).
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enablePackageExports = true;

// Expo Router 57 vendors React Navigation. Solito's useRouter/useLinkTo import
// `@react-navigation/native`, which is a different LinkingContext instance than
// ExpoRoot provides — login then throws "Couldn't find a LinkingContext context."
const expoNavRoot = path.resolve(projectRoot, 'node_modules/expo-router/build/react-navigation');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@react-navigation/native' || moduleName === '@react-navigation/core') {
    const dir = moduleName === '@react-navigation/native' ? 'native' : 'core';
    return { filePath: path.join(expoNavRoot, dir, 'index.js'), type: 'sourceFile' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

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

module.exports = config;

// Firebase JS SDK (v9+) を Expo/Metro で動かすための設定。
// これがないと "Component auth has not been registered yet" などの
// エラーが出るため必須。
// - cjs: Firebase の一部モジュールは .cjs で配布される
// - unstable_enablePackageExports=false: package.json の exports 解決で
//   ブラウザ向けビルドが選ばれてしまうのを防ぐ
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

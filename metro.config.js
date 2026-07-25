// Firebase JS SDK (v9+) を Expo/Metro で動かすための設定。
// これがないと "Component auth has not been registered yet" などの
// エラーが出るため必須。
// - cjs: Firebase の一部モジュールは .cjs で配布される
// - unstable_enablePackageExports=false: package.json の exports 解決で
//   ブラウザ向けビルドが選ばれてしまうのを防ぐ
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Web プレビュー専用の差し替え。
// ここに挙げたモジュールはネイティブ専用で web 実装を持たないため、
// platform === 'web' のときだけプロジェクト内のシムへ解決する。
// iOS / Android のビルドはこの分岐を通らず、本来の実装を使う。
const WEB_SHIMS = {
  '@react-native-community/datetimepicker': path.resolve(
    __dirname,
    'web-shims/DateTimePicker.web.tsx'
  ),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_SHIMS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_SHIMS[moduleName] };
  }
  const resolve = defaultResolveRequest || context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;

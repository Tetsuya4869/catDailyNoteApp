import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { CatColor } from '../types';

/**
 * 毛色ごとの猫アイコン。
 *
 * 画像は scripts/generate_icons.py で生成している（assets/icons/cat-*.png）。
 * require はビルド時に解決される必要があるため、動的パスではなく
 * 毛色をキーにした静的なマップで持つ。
 */
const CAT_FACES: Record<CatColor, number> = {
  orange: require('../../assets/icons/cat-orange.png'),
  black: require('../../assets/icons/cat-black.png'),
  white: require('../../assets/icons/cat-white.png'),
  gray: require('../../assets/icons/cat-gray.png'),
  calico: require('../../assets/icons/cat-calico.png'),
  tabby: require('../../assets/icons/cat-tabby.png'),
};

type Props = {
  color: CatColor;
  /** 一辺の長さ（px）。正方形で描画する */
  size: number;
  style?: StyleProp<ImageStyle>;
};

export default function CatFaceIcon({ color, size, style }: Props) {
  return (
    <Image
      source={CAT_FACES[color]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      // 猫の名前が隣に併記される箇所が多いため、既定では読み上げ対象にしない
      accessible={false}
    />
  );
}

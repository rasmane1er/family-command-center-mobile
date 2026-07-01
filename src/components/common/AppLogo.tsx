import React from 'react';
import { Image, View, StyleSheet, ViewStyle } from 'react-native';

const ICON = require('../../assets/icon.png');

interface Props {
  size?: number;
  style?: ViewStyle;
  rounded?: boolean;
}

export function AppLogo({ size = 48, style, rounded = false }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={ICON}
        style={[
          { width: size, height: size },
          rounded && { borderRadius: size * 0.22 },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

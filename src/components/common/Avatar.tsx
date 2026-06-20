import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  name: string;
  color?: string;
  size?: number;
  imageUri?: string;
  style?: ViewStyle;
  showBadge?: boolean;
  badgeColor?: string;
  badgeIcon?: string;
}

export function Avatar({ name, color, size = 48, imageUri, style, showBadge, badgeColor }: Props) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size * 0.38;
  const avatarColor = color || colors.avatars[0];

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColor,
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { fontSize, color: '#fff' }]}>{initials}</Text>
        )}
      </View>
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: badgeColor || colors.success,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

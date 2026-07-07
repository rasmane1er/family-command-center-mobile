import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useSignedImageUri } from '../../hooks/useSignedImageUri';

interface Props {
  name: string;
  color?: string;
  size?: number;
  imageUri?: string;
  style?: ViewStyle;
  showBadge?: boolean;
  badgeColor?: string;
  badgeIcon?: string;
  /** If provided, tapping the avatar opens the image picker */
  onImagePicked?: (uri: string) => void;
  editable?: boolean;
}

export function Avatar({
  name,
  color,
  size = 48,
  imageUri,
  style,
  showBadge,
  badgeColor,
  onImagePicked,
  editable = false,
}: Props) {
  const { t } = useTranslation();
  const resolvedImageUri = useSignedImageUri(imageUri);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size * 0.38;
  const avatarColor = color || colors.avatars[0];

  async function handlePress() {
    if (!editable && !onImagePicked) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('screens.shared.permissionNeededTitle'),
        t('screens.shared.permissionNeededPhotoMsg')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onImagePicked?.(result.assets[0].uri);
    }
  }

  const isEditable = editable || !!onImagePicked;

  const inner = (
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
      {resolvedImageUri ? (
        <Image
          source={{ uri: resolvedImageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color: '#fff' }]}>{initials}</Text>
      )}

      {/* Camera overlay when editable */}
      {isEditable && (
        <View style={[styles.editOverlay, { borderRadius: size / 2 }]}>
          <Ionicons name="camera" size={size * 0.28} color="#fff" />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.wrapper, style]}>
      {isEditable ? (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
          {inner}
        </TouchableOpacity>
      ) : (
        inner
      )}

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
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

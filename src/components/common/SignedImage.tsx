import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { useSignedImageUri } from '../../hooks/useSignedImageUri';

interface Props {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const RESIZE_MODE_TO_CONTENT_FIT: Record<NonNullable<Props['resizeMode']>, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  repeat: 'cover', // expo-image has no tiling mode; cover is the closest non-distorting fallback
  center: 'none',
};

// Drop-in replacement for <Image source={{ uri }}> wherever the value might
// be an R2 object key (private bucket — needs a freshly-signed URL) rather
// than a local file:// URI or legacy http(s) URL. Needed anywhere an image is
// rendered inside a list (a bare useSignedImageUri() call per list item would
// violate the rules of hooks), e.g. task-completion photo thumbnails.
// Uses expo-image (not RN's built-in Image) for its persistent disk cache —
// presigned R2 URLs are re-signed on every cold start (see uploadService.ts's
// 45-min in-memory cache), so without a disk cache every app launch
// re-downloaded every visible photo/avatar from scratch.
export function SignedImage({ uri, style, resizeMode }: Props) {
  const resolved = useSignedImageUri(uri);
  if (!resolved) return null;
  return (
    <Image
      source={{ uri: resolved }}
      style={style}
      contentFit={resizeMode ? RESIZE_MODE_TO_CONTENT_FIT[resizeMode] : undefined}
      cachePolicy="disk"
    />
  );
}

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useSignedImageUri } from '../../hooks/useSignedImageUri';

interface Props {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

// Drop-in replacement for <Image source={{ uri }}> wherever the value might
// be an R2 object key (private bucket — needs a freshly-signed URL) rather
// than a local file:// URI or legacy http(s) URL. Needed anywhere an image is
// rendered inside a list (a bare useSignedImageUri() call per list item would
// violate the rules of hooks), e.g. task-completion photo thumbnails.
export function SignedImage({ uri, style, resizeMode }: Props) {
  const resolved = useSignedImageUri(uri);
  if (!resolved) return null;
  return <Image source={{ uri: resolved }} style={style} resizeMode={resizeMode} />;
}

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { TURNSTILE_SITE_KEY } from '../../config/turnstile';
import { awsConfig } from '../../config/aws';

interface Props {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

// Cloudflare's Turnstile widget is a web (JS) component — there's no native
// RN SDK, so it's hosted in a small WebView. Loads a real page served by the
// backend (GET /turnstile-widget.html, see app.ts) rather than an inline
// HTML string: Turnstile validates the widget against the hostname it's
// actually served from, and a WebView loading raw HTML has no real origin
// to match against the hostname registered in the Cloudflare dashboard.
// Renders nothing (returns null) when EXPO_PUBLIC_TURNSTILE_SITE_KEY isn't
// configured — see src/config/turnstile.ts.
export function TurnstileWidget({ onToken, onExpire }: Props) {
  const uri = useMemo(() => {
    if (!TURNSTILE_SITE_KEY) return null;
    return `${awsConfig.apiBaseUrl}/turnstile-widget.html?sitekey=${encodeURIComponent(TURNSTILE_SITE_KEY)}`;
  }, []);

  if (!uri) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'token' && typeof data.token === 'string') {
        onToken(data.token);
      } else if (data.type === 'expire') {
        onExpire?.();
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ uri }}
        onMessage={handleMessage}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 76, marginBottom: 8, alignItems: 'center' },
  webview: { width: 300, height: 76, backgroundColor: 'transparent' },
});

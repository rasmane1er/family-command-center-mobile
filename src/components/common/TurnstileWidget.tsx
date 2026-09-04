import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { TURNSTILE_SITE_KEY } from '../../config/turnstile';
import { awsConfig } from '../../config/aws';

// How long to wait for a token before treating the widget as stuck. Cloudflare's
// own UI shows an indefinite "Verifying..." spinner with no way out if the
// challenge never resolves (seen in the field on flaky/high-latency mobile
// networks) — our bridge only ever understood 'token'/'expire' messages, so a
// hang here previously left the user stuck forever with no error and no retry.
const TIMEOUT_MS = 20000;

interface Props {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

// Cloudflare's Turnstile widget is a web (JS) component — there's no native
// RN SDK, so it's hosted in a small WebView. Loads a real page served by the
// backend (GET /turnstile-widget.html, see app.ts) rather than an inline
// HTML string: Turnstile validates the widget against the hostname it's
// actually served from, and a WebView loading raw HTML has no real origin
// to match against the hostname registered in the Cloudflare dashboard.
// Renders nothing (returns null) when EXPO_PUBLIC_TURNSTILE_SITE_KEY isn't
// configured — see src/config/turnstile.ts.
export function TurnstileWidget({ onToken, onExpire, onError }: Props) {
  const uri = useMemo(() => {
    if (!TURNSTILE_SITE_KEY) return null;
    return `${awsConfig.apiBaseUrl}/turnstile-widget.html?sitekey=${encodeURIComponent(TURNSTILE_SITE_KEY)}`;
  }, []);

  // Latest callback refs so the timeout (armed once, on mount) always calls
  // whatever the parent last passed in, without re-arming on every render.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!uri) return;
    resolvedRef.current = false;
    const timer = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        onErrorRef.current?.();
      }
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [uri]);

  if (!uri) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'token' && typeof data.token === 'string') {
        resolvedRef.current = true;
        onTokenRef.current(data.token);
      } else if (data.type === 'expire') {
        onExpire?.();
      } else if (data.type === 'error') {
        resolvedRef.current = true;
        onErrorRef.current?.();
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

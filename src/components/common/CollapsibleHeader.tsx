import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

interface RenderProps {
  onScroll: ScrollHandler;
  onScrollEndDrag: ScrollHandler;
  onMomentumScrollEnd: ScrollHandler;
  scrollEventThrottle: number;
  contentPaddingTop: number;
}

interface Props {
  /** Full-size header shown at the top of the screen */
  fullHeader: React.ReactNode;
  /** Slim bar (~50–60px) that stays pinned once the full header scrolls away */
  compactHeader: React.ReactNode;
  children: (props: RenderProps) => React.ReactNode;
  wrapperStyle?: ViewStyle;
}

const SNAP_MS = 180;

/**
 * Slim sticky bar pattern:
 *   • At top: full header visible, compact bar hidden.
 *   • Scroll up: full header slides off the top with the page (1:1 tracking).
 *     Once fully hidden, compact bar fades in and stays pinned — giving back
 *     the entire full-header height as usable content space.
 *   • Scroll down: full header instantly slides back, compact bar fades out.
 */
export function CollapsibleHeader({ fullHeader, compactHeader, children, wrapperStyle }: Props) {
  const [fullHeight, setFullHeight] = useState(0);
  const [compactHeight, setCompactHeight] = useState(56);
  const fullHeightRef = useRef(0);
  const compactHeightRef = useRef(56);

  // Full header slides up and off
  const fullTranslateY = useRef(new Animated.Value(0)).current;
  const fullCurrentY = useRef(0);

  // Compact bar fades in once full header is gone
  const compactOpacity = useRef(new Animated.Value(0)).current;
  const compactVisible = useRef(false);

  const lastScrollY = useRef(0);

  function onFullLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h && Math.abs(h - fullHeightRef.current) > 1) {
      fullHeightRef.current = h;
      setFullHeight(h);
    }
  }

  function onCompactLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h && Math.abs(h - compactHeightRef.current) > 1) {
      compactHeightRef.current = h;
      setCompactHeight(h);
    }
  }

  function showCompact() {
    if (compactVisible.current) return;
    compactVisible.current = true;
    Animated.timing(compactOpacity, { toValue: 1, duration: SNAP_MS, useNativeDriver: true }).start();
  }

  function hideCompact() {
    if (!compactVisible.current) return;
    compactVisible.current = false;
    Animated.timing(compactOpacity, { toValue: 0, duration: SNAP_MS, useNativeDriver: true }).start();
  }

  const onScroll: ScrollHandler = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const diff = y - lastScrollY.current;
    lastScrollY.current = y;

    const h = fullHeightRef.current;
    if (h === 0) return;

    if (y <= 0 || diff < 0) {
      // At top OR scrolling DOWN — restore full header instantly
      if (fullCurrentY.current !== 0) {
        fullCurrentY.current = 0;
        fullTranslateY.setValue(0);
      }
      hideCompact();
      return;
    }

    // Scrolling UP — full header tracks page 1:1
    const next = Math.max(-h, fullCurrentY.current - diff);
    if (next !== fullCurrentY.current) {
      fullCurrentY.current = next;
      fullTranslateY.setValue(next);
    }

    // Once full header is fully off-screen, show compact bar
    if (fullCurrentY.current <= -h) {
      showCompact();
    } else {
      hideCompact();
    }
  };

  const settle: ScrollHandler = (e) => {
    const h = fullHeightRef.current;
    if (h === 0) return;
    const y = e.nativeEvent.contentOffset.y;

    if (y <= 0 || fullCurrentY.current > -h / 2) {
      // Snap to fully shown
      fullCurrentY.current = 0;
      Animated.timing(fullTranslateY, { toValue: 0, duration: SNAP_MS, useNativeDriver: true }).start();
      hideCompact();
    } else {
      // Snap to fully hidden → show compact
      fullCurrentY.current = -h;
      Animated.timing(fullTranslateY, { toValue: -h, duration: SNAP_MS, useNativeDriver: true }).start();
      showCompact();
    }
  };

  return (
    <View style={styles.flexFill}>
      {/* Full header — slides off the top as user scrolls up */}
      <Animated.View
        onLayout={onFullLayout}
        style={[styles.layer, wrapperStyle, { zIndex: 49, transform: [{ translateY: fullTranslateY }] }]}
      >
        {fullHeader}
      </Animated.View>

      {/* Compact bar — pinned, fades in once full header is gone */}
      <Animated.View
        onLayout={onCompactLayout}
        pointerEvents={compactVisible.current ? 'box-none' : 'none'}
        style={[styles.layer, styles.compactLayer, { opacity: compactOpacity }]}
      >
        {compactHeader}
      </Animated.View>

      {/* Scrollable content — padded by full header height so it starts below it */}
      {children({
        onScroll,
        onScrollEndDrag: settle,
        onMomentumScrollEnd: settle,
        scrollEventThrottle: 16,
        contentPaddingTop: fullHeight,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  compactLayer: {
    zIndex: 50,
  },
});

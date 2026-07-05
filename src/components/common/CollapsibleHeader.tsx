import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// Buffer (px) around the fully-collapsed position used for the compact bar's
// tap-target toggle, so a pixel of scroll noise right at the boundary can't
// flip `isCompactVisible` on/off repeatedly.
const HYSTERESIS_PX = 24;

/**
 * Facebook/Twitter-style collapsing header: `Animated.event()` feeds raw
 * scroll position into `scrollY`, and the header's translateY / compact
 * bar's opacity are both plain, stateless `interpolate()`s of that single
 * value, clamped to `[0, fullHeight]`. Being a pure function of the current
 * absolute scroll position (not an accumulator) means there's nothing that
 * can ever drift out of sync — whatever the latest scroll position is, the
 * header's position is deterministically derived from it on every frame.
 *
 * This used to run through `Animated.diffClamp` instead of `scrollY`
 * directly — diffClamp tracks *cumulative delta* rather than absolute
 * position, which is fine as long as every scroll event is accounted for,
 * but broke in a platform-specific way: iOS's rubber-band bounce lets
 * `contentOffset.y` go negative when you pull past the top, while Android
 * hard-clamps at 0 with an edge-glow effect instead — so the two platforms
 * don't dispatch the same pattern of scroll events during that gesture.
 * Whenever an event got coalesced or the accumulator's internal state ended
 * up even slightly off from true scroll position, the header could get
 * stuck partially collapsed on iOS even at literal contentOffset.y === 0,
 * with no way to correct it short of a fresh full scroll-to-bottom-and-back.
 * Interpolating `scrollY` directly has no accumulated state to drift in the
 * first place, so this class of bug can't recur — and diffClamp's actual
 * advantage (preserving position independent of a snap-to-edge animation)
 * doesn't apply here anymore, since this header doesn't snap to an edge on
 * release; it just tracks scroll continuously either way.
 *
 * `useNativeDriver` is `false` (not `true`) because every screen using this
 * component wires `onScroll` into a plain ScrollView/FlatList, not an
 * Animated-wrapped one; `Animated.event` with the native driver returns an
 * object meant to be attached natively by `Animated.ScrollView`/
 * `Animated.FlatList` rather than called as a function, which crashes on a
 * plain scroll container. Running through `Animated.event` on the JS thread
 * still avoids a full React re-render per scroll frame (only the Animated
 * graph updates), so it stays smooth even without the native driver.
 */
export function CollapsibleHeader({ fullHeader, compactHeader, children, wrapperStyle }: Props) {
  const [fullHeight, setFullHeight] = useState(0);
  const fullHeightRef = useRef(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const h = fullHeight || 1;

  // Animated nodes wired into the native view graph — memoized so they keep
  // a stable identity across unrelated re-renders (any store update
  // anywhere in a big screen, a timer, anything). A fresh node identity
  // every render would force RN to tear down and reattach the native
  // animated graph, a real stutter source independent of everything above.
  const translateY = useMemo(
    () => scrollY.interpolate({ inputRange: [0, h], outputRange: [0, -h], extrapolate: 'clamp' }),
    [scrollY, h]
  );
  const compactOpacity = useMemo(
    () =>
      fullHeight > 0
        ? scrollY.interpolate({
            inputRange: [Math.max(0, fullHeight - HYSTERESIS_PX), fullHeight],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : 0,
    [scrollY, fullHeight]
  );

  // Discrete visibility just for `pointerEvents` (so the compact bar's back
  // button isn't tappable while invisible) — a plain listener, decoupled
  // from the opacity animation above, so it can't cause any visual flicker.
  const compactVisible = useRef(false);
  const [isCompactVisible, setIsCompactVisible] = useState(false);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      if (fullHeightRef.current === 0) return;
      const collapsed = value >= fullHeightRef.current - HYSTERESIS_PX;
      if (collapsed !== compactVisible.current) {
        compactVisible.current = collapsed;
        setIsCompactVisible(collapsed);
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  function onFullLayout(e: LayoutChangeEvent) {
    const measured = Math.round(e.nativeEvent.layout.height);
    if (measured && Math.abs(measured - fullHeightRef.current) > 1) {
      fullHeightRef.current = measured;
      setFullHeight(measured);
    }
  }

  // useNativeDriver: false — the 84 screens using this component all pass
  // this handler to a plain ScrollView/FlatList, not Animated.ScrollView /
  // Animated.FlatList. With useNativeDriver: true, Animated.event() returns
  // an AnimatedEvent *object* (meant to be attached natively by an Animated-
  // wrapped scroll component), not a callable function — a plain scroll
  // container tries to call it directly and crashes ("onScroll is not a
  // function"). This still runs through the Animated system (not React
  // state/setState per frame), so it stays smooth — it's just JS-thread
  // driven instead of native-thread driven.
  //
  // Created once via useRef rather than fresh on every render: a new
  // function identity every render means the consumer's <ScrollView
  // onScroll={onScroll}> prop changes every render too, which makes React
  // Native detach and reattach the native scroll listener each time —
  // another real stutter source, independent of the driver question, if
  // the screen re-renders for any unrelated reason while mid-scroll.
  const onScroll = useRef(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    ) as ScrollHandler
  ).current;
  const noop = useRef<ScrollHandler>(() => {}).current;

  return (
    <View style={styles.flexFill}>
      {/* Full header — slides off the top as user scrolls up */}
      <Animated.View
        onLayout={onFullLayout}
        style={[styles.layer, wrapperStyle, { zIndex: 49, transform: [{ translateY }] }]}
      >
        {fullHeader}
      </Animated.View>

      {/* Compact bar — pinned, fades in once full header is gone */}
      <Animated.View
        pointerEvents={isCompactVisible ? 'box-none' : 'none'}
        style={[styles.layer, styles.compactLayer, { opacity: compactOpacity }]}
      >
        {compactHeader}
      </Animated.View>

      {/* Scrollable content — padded by full header height so it starts below it */}
      {children({
        onScroll,
        onScrollEndDrag: noop,
        onMomentumScrollEnd: noop,
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

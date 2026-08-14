import { useWindowDimensions } from 'react-native';

// 768pt is the standard tablet breakpoint (iPad mini portrait width, and the
// threshold Apple's own HIG size classes switch on) — matches app.json's
// supportsTablet: true, which until now had no layout actually branching on
// screen size, so iPad just ran the phone layout scaled up.
const TABLET_BREAKPOINT = 768;
// Beyond this, further columns stop helping readability — cap content width
// and let the screen letterbox instead of stretching cards edge-to-edge on
// a 13" iPad.
const MAX_CONTENT_WIDTH = 960;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  return {
    width,
    height,
    isTablet,
    contentWidth,
    // Grid helper: given a target minimum tile width and the horizontal
    // gutters already reserved by the caller, returns how many columns fit.
    // Phones stay at `minColumns` (their existing fixed layout) so this is
    // purely additive on larger screens rather than a behavior change below
    // the tablet breakpoint.
    gridColumns(minColumns: number, tileMinWidth: number, gutter: number) {
      if (!isTablet) return minColumns;
      const usable = contentWidth - gutter;
      const fitted = Math.floor(usable / (tileMinWidth + gutter));
      return Math.max(minColumns, fitted);
    },
  };
}

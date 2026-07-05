import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mirrors the floating CustomTabBar's own layout math exactly (see
// src/navigation/CustomTabBar.tsx) so bottom-anchored screen content — chat
// input bars, FABs — can reserve exactly enough space to clear it instead of
// each screen guessing its own magic number (which is what caused the tab
// bar to overlap several "Ask AI" inputs after the bar became floating).
const TAB_BAR_GAP = 10;            // container's extra offset above insets.bottom
const TAB_BAR_SURFACE_HEIGHT = 82; // tabs paddingTop(12) + tallest tab content(~58) + paddingBottom(12)
const BREATHING_ROOM = 24;         // generous safety margin — better a visible gap than a dead-tap zone

/** Total space bottom-anchored content should reserve to clear the floating tab bar. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return (insets.bottom || 12) + TAB_BAR_GAP + TAB_BAR_SURFACE_HEIGHT + BREATHING_ROOM;
}

/**
 * Distance from the screen's bottom edge to the top edge of the floating tab
 * bar itself — no BREATHING_ROOM padding included. Use this (instead of
 * useTabBarInset) for content that should sit flush/docked right above the
 * tab bar, like a chat input bar — useTabBarInset's extra margin is meant
 * for scrollable content or FABs, and leaves a large dead gap when reused
 * for a docked input.
 */
export function useTabBarDockOffset(): number {
  const insets = useSafeAreaInsets();
  return (insets.bottom || 12) + TAB_BAR_GAP + TAB_BAR_SURFACE_HEIGHT;
}

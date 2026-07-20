import React from 'react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Wraps a screen component in its own ErrorBoundary so a crash in one screen
// shows a recoverable fallback in place of just that screen — the navigator
// (tab bar, header, back button) stays mounted and the user can navigate
// away, instead of the single app-root ErrorBoundary in App.tsx tearing down
// the entire app and losing all navigation state.
// Typed loosely (matching how react-navigation's own `component` prop accepts
// screens) rather than generically preserving each screen's own Props type —
// a handful of screens declare bespoke navigation prop shapes that a generic
// wrapper's stricter inference broke compatibility with.
//
// Every navigator calls this inline in JSX (`component={withScreenErrorBoundary(X)}`),
// so it must return the *same* Wrapped reference for the same Component across
// calls. Without this cache, a fresh Wrapped component is created on every render
// of the enclosing navigator, and react-navigation treats a changed `component`
// identity as a brand-new screen type — unmounting and remounting the active
// screen every time. For navigators that re-render often (e.g. TabNavigator,
// which subscribes to several Zustand stores), that remount can retrigger a
// mount-time effect (like a screen's `fetchFromServer()`) that updates one of
// those same stores, causing another re-render, another remount, and so on —
// which is what was surfacing as "Maximum update depth exceeded".
const cache = new WeakMap<React.ComponentType<any>, React.ComponentType<any>>();

export function withScreenErrorBoundary(
  Component: React.ComponentType<any>
): React.ComponentType<any> {
  const cached = cache.get(Component);
  if (cached) return cached;

  const Wrapped = (props: any) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withScreenErrorBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;
  cache.set(Component, Wrapped);
  return Wrapped;
}

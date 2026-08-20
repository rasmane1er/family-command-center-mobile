import type { WidgetTaskHandler } from 'react-native-android-widget';
import { FamilyGlanceWidget } from './FamilyGlanceWidget';
import { getWidgetData } from './widgetStorage';

// Fires for every widget lifecycle event (added to home screen, periodic
// update, resized, clicked, deleted) — the same handler re-renders on all
// of them since this widget has no click actions and nothing size-
// dependent, just "draw whatever's currently synced."
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(<FamilyGlanceWidget data={getWidgetData()} />);
};

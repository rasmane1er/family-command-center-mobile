import { requestWidgetUpdate } from 'react-native-android-widget';
import { FamilyGlanceWidget, type FamilyGlanceData } from './FamilyGlanceWidget';

const WIDGET_NAME = 'FamilyGlanceWidget';

// Small .tsx wrapper so widgetSync.ts (a plain .ts file, no JSX) can push a
// live widget redraw without hand-calling React.createElement.
export function pushAndroidWidgetUpdate(data: FamilyGlanceData): void {
  void requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <FamilyGlanceWidget data={data} />,
  });
}

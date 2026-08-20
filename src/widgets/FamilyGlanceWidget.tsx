import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Android counterpart to targets/widget/widget.swift — same data contract
// (see widgetStorage.ts), same layout intent (family name, open task count,
// next event), rebuilt with this library's RemoteViews-backed primitives
// since there's no shared cross-platform widget renderer.
export interface FamilyGlanceData {
  familyName: string;
  openTasksCount: number;
  nextEventTitle: string;
  nextEventTime: string;
  updatedAt: string;
}

const MUTED = '#6B7280';
const TEXT = '#111827';

export function FamilyGlanceWidget({ data }: { data: FamilyGlanceData | null }) {
  if (!data) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
        }}
      >
        <TextWidget
          text="Open Family Command Center to sync"
          style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
      }}
    >
      <TextWidget
        text={data.familyName}
        maxLines={1}
        style={{ fontSize: 12, fontWeight: '600', color: MUTED }}
      />

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <TextWidget
          text={String(data.openTasksCount)}
          style={{ fontSize: 28, fontWeight: 'bold', color: TEXT }}
        />
        <TextWidget
          text={data.openTasksCount === 1 ? ' open task' : ' open tasks'}
          style={{ fontSize: 12, color: MUTED, marginLeft: 4 }}
        />
      </FlexWidget>

      {!!data.nextEventTitle && (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 10 }}>
          <TextWidget
            text={data.nextEventTitle}
            maxLines={1}
            style={{ fontSize: 12, fontWeight: '500', color: TEXT }}
          />
          {!!data.nextEventTime && (
            <TextWidget text={data.nextEventTime} style={{ fontSize: 11, color: MUTED }} />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

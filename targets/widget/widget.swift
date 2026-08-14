import WidgetKit
import SwiftUI

// App Group must match app.json's ios.entitlements and this target's
// expo-target.config.js entitlements block exactly, or UserDefaults(suiteName:)
// silently returns nil and the widget always shows the placeholder state.
let appGroup = "group.com.grasmane.familycommandcenter"
let dataKey = "widgetData"

struct FamilyGlanceData: Decodable {
  let familyName: String
  let openTasksCount: Int
  let nextEventTitle: String?
  let nextEventTime: String?
  let updatedAt: String?
}

struct FamilyGlanceEntry: TimelineEntry {
  let date: Date
  let data: FamilyGlanceData?
}

// Reads the JSON blob the main app writes via `ExtensionStorage.set("widgetData", ...)`
// (see src/services/widgetSync.ts). Returns nil if the app hasn't synced yet
// (fresh install) rather than showing stale/fake placeholder numbers.
func loadGlanceData() -> FamilyGlanceData? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.data(forKey: dataKey) else {
    return nil
  }
  return try? JSONDecoder().decode(FamilyGlanceData.self, from: raw)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> FamilyGlanceEntry {
    FamilyGlanceEntry(date: Date(), data: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (FamilyGlanceEntry) -> Void) {
    completion(FamilyGlanceEntry(date: Date(), data: loadGlanceData()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FamilyGlanceEntry>) -> Void) {
    let entry = FamilyGlanceEntry(date: Date(), data: loadGlanceData())
    // The app calls ExtensionStorage.reloadWidget() on every data refresh, so
    // this timeline only needs a distant fallback refresh in case that signal
    // is ever missed (e.g. app force-quit before a sync could fire).
    let nextRefresh = Calendar.current.date(byAdding: .hour, value: 4, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }
}

struct FamilyGlanceWidgetView: View {
  var entry: Provider.Entry

  var body: some View {
    if let data = entry.data {
      VStack(alignment: .leading, spacing: 6) {
        Text(data.familyName)
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundColor(.secondary)
          .lineLimit(1)

        Spacer(minLength: 2)

        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text("\(data.openTasksCount)")
            .font(.system(size: 28, weight: .bold, design: .rounded))
          Text(data.openTasksCount == 1 ? "open task" : "open tasks")
            .font(.caption)
            .foregroundColor(.secondary)
        }

        if let title = data.nextEventTitle, !title.isEmpty {
          Divider()
          VStack(alignment: .leading, spacing: 1) {
            Text(title)
              .font(.caption)
              .fontWeight(.medium)
              .lineLimit(1)
            if let time = data.nextEventTime {
              Text(time)
                .font(.caption2)
                .foregroundColor(.secondary)
            }
          }
        }
      }
      .padding(12)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    } else {
      VStack(spacing: 4) {
        Image(systemName: "house.fill")
          .foregroundColor(.secondary)
        Text("Open Family Command Center to sync")
          .font(.caption2)
          .foregroundColor(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding(12)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
}

struct FamilyGlanceWidget: Widget {
  let kind: String = "FamilyGlanceWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        FamilyGlanceWidgetView(entry: entry)
          .containerBackground(.background, for: .widget)
      } else {
        FamilyGlanceWidgetView(entry: entry)
          .background()
      }
    }
    .configurationDisplayName("Family Glance")
    .description("Today's open tasks and next family event.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct FamilyGlanceWidgetBundle: WidgetBundle {
  var body: some Widget {
    FamilyGlanceWidget()
  }
}

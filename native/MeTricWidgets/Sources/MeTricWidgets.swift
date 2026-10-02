import WidgetKit
import SwiftUI

struct MeTricEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct MeTricTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> MeTricEntry {
        MeTricEntry(date: Date(), payload: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (MeTricEntry) -> Void) {
        let payload = WidgetDataLoader.load()
        let entry = MeTricEntry(date: Date(), payload: payload)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MeTricEntry>) -> Void) {
        let payload = WidgetDataLoader.load()
        let currentDate = Date()
        let entry = MeTricEntry(date: currentDate, payload: payload)

        // If Flow is actively running, update every 60 seconds; otherwise every 5 minutes
        let nextUpdateInterval: TimeInterval
        if let flow = payload.flow, flow.isActive && !flow.isPaused {
            nextUpdateInterval = 60
        } else {
            nextUpdateInterval = 300
        }

        let nextDate = currentDate.addingTimeInterval(nextUpdateInterval)
        let timeline = Timeline(entries: [entry], policy: .after(nextDate))
        completion(timeline)
    }
}

struct MeTricWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: MeTricEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(payload: entry.payload)
            default:
                MediumWidgetView(payload: entry.payload)
            }
        }
        .containerBackground(Color(red: 0.055, green: 0.059, blue: 0.071), for: .widget)
    }
}

@main
struct MeTricWidgets: Widget {
    let kind: String = "com.abhinav.metric.widgets"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MeTricTimelineProvider()) { entry in
            MeTricWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MeTric")
        .description("Track your cognitive flow, deep work, and daily targets directly on your desktop.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

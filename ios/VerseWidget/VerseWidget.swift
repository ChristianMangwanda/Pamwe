// VerseWidget.swift — WidgetKit glue: timeline + configuration.
// The visuals live in VerseWidgetView.swift (pure SwiftUI). This file maps the
// system widget family to our WidgetSize and rolls the verse over at midnight.

import WidgetKit
import SwiftUI

struct VerseEntry: TimelineEntry {
    let date: Date
    let verse: Verse
}

struct VerseProvider: TimelineProvider {
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(date: Date(), verse: VerseStore.fallback)
    }

    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        completion(VerseEntry(date: Date(), verse: VerseStore.verse(for: Date())))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        let now = Date()
        let entry = VerseEntry(date: now, verse: VerseStore.verse(for: now))
        // Rebuild the timeline at the next local midnight so the verse changes with
        // the calendar date.
        let calendar = Calendar.current
        let nextMidnight = calendar.date(
            byAdding: .day, value: 1, to: calendar.startOfDay(for: now)
        ) ?? now.addingTimeInterval(86_400)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }
}

struct VerseWidgetEntryView: View {
    var entry: VerseEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let size = widgetSize(for: family)
        WidgetContent(verse: entry.verse, size: size)
            .containerBackground(for: .widget) {
                WidgetBackground(size: size, tree: Image("Tree"))
            }
    }

    private func widgetSize(for family: WidgetFamily) -> WidgetSize {
        switch family {
        case .systemSmall: return .small
        case .systemLarge: return .large
        default: return .medium
        }
    }
}

struct VerseWidget: Widget {
    let kind = "VerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VerseProvider()) { entry in
            VerseWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "pamwe://today"))
        }
        .configurationDisplayName("Verse of the Day")
        .description("One verse each morning, to carry into the day.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// LockVerseWidget.swift — WidgetKit glue for the Lock Screen verse.
// The visuals live in LockVerseView.swift (pure SwiftUI, renders off device).
//
// The design offered two treatments, 2b "Sheer" (a faint rounded panel) and 2c
// "Clear" (nothing behind the text). On the Lock Screen iOS owns that layer:
// widgets render in vibrant mode and the only sanctioned backdrop is
// AccessoryWidgetBackground, whose exact tint and blur are the system's to pick.
// So the choice ships as the toggle the handoff asked for, and the system draws
// whichever side of it the couple lands on.

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Configuration

struct LockVerseConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Verse on the Lock Screen"
    static var description = IntentDescription(
        "One verse a day, under your clock."
    )

    @Parameter(title: "Clear background", default: false)
    var clearBackground: Bool
}

// MARK: - Timeline

struct LockVerseEntry: TimelineEntry {
    let date: Date
    let verse: Verse
    let days: Int?
    let clearBackground: Bool
}

struct LockVerseProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> LockVerseEntry {
        LockVerseEntry(date: Date(), verse: VerseStore.fallback, days: nil, clearBackground: false)
    }

    func snapshot(for configuration: LockVerseConfiguration, in context: Context) async -> LockVerseEntry {
        entry(at: Date(), configuration: configuration)
    }

    func timeline(for configuration: LockVerseConfiguration, in context: Context) async -> Timeline<LockVerseEntry> {
        let now = Date()
        // Both the verse and the day count roll over at local midnight, so one
        // entry and one reload boundary covers the pair.
        let calendar = Calendar.current
        let nextMidnight = calendar.date(
            byAdding: .day, value: 1, to: calendar.startOfDay(for: now)
        ) ?? now.addingTimeInterval(86_400)
        return Timeline(entries: [entry(at: now, configuration: configuration)], policy: .after(nextMidnight))
    }

    private func entry(at date: Date, configuration: LockVerseConfiguration) -> LockVerseEntry {
        LockVerseEntry(
            date: date,
            verse: VerseStore.verse(for: date),
            days: SharedData.daysTogether(now: date),
            clearBackground: configuration.clearBackground
        )
    }
}

// MARK: - Widget

struct LockVerseEntryView: View {
    var entry: LockVerseEntry

    var body: some View {
        LockVerseView(verse: entry.verse, days: entry.days)
            .containerBackground(for: .widget) {
                // 2c is the absence of the panel, not a lighter one.
                if !entry.clearBackground {
                    AccessoryWidgetBackground()
                }
            }
    }
}

struct LockVerseWidget: Widget {
    let kind = "LockVerseWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: LockVerseConfiguration.self,
            provider: LockVerseProvider()
        ) { entry in
            LockVerseEntryView(entry: entry)
                .widgetURL(entry.verse.readerURL)
        }
        .configurationDisplayName("Verse on the Lock Screen")
        .description("One verse a day, under your clock.")
        .supportedFamilies([.accessoryRectangular])
    }
}

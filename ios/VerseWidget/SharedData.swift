// SharedData.swift — the one thing the widgets read from the app.
//
// The Home Screen widget stays fully self-contained (bundled verses.json, keyed
// by day-of-year). The Lock Screen widget adds a counter that cannot be
// bundled, so the app writes a single date into the shared App Group and this
// reads it back. Nothing else crosses the boundary.
//
// The app writes the date the couple COUNTS FROM, already resolved: their own
// anniversary when they have set one, otherwise the day they paired. Resolving
// it on the app side keeps that rule in one place (src/lib/couples.ts), so the
// widget can never disagree with the You tab.

import Foundation

enum SharedData {
    /// Must match both .entitlements files exactly.
    private static let appGroup = "group.com.christianmangwanda.pamwe"
    private static let anniversaryKey = "anniversary"

    /// 'YYYY-MM-DD' as a local calendar day, or nil before the app has ever
    /// written one (fresh install, signed out, or a build without the group).
    static func togetherSince(now: Date = Date(), calendar: Calendar = .current) -> Date? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: anniversaryKey)
        else { return nil }
        return parseISODate(raw, calendar: calendar)
    }

    /// Whole days from the shared date to today, counting the first day as 1.
    /// Nil when there is nothing to count from, which is what hides the counter.
    ///
    /// Mirrors daysTogether() in src/lib/couples.ts, including the "first day is
    /// 1" convention: the two numbers sit on the same phone and are compared.
    static func daysTogether(now: Date = Date(), calendar: Calendar = .current) -> Int? {
        guard let since = togetherSince(now: now, calendar: calendar) else { return nil }
        let from = calendar.startOfDay(for: since)
        let to = calendar.startOfDay(for: now)
        guard let days = calendar.dateComponents([.day], from: from, to: to).day else { return nil }
        // A future date would read as a negative count, and the Lock Screen has
        // no room to explain itself.
        return max(0, days + 1)
    }

    /// Parses the raw column value as a LOCAL calendar day. Using an ISO8601
    /// parser would read it as UTC midnight and shift the day for anyone west
    /// of Greenwich, which is exactly the class of bug that makes a counter
    /// disagree with the app by one.
    static func parseISODate(_ raw: String, calendar: Calendar = .current) -> Date? {
        let parts = raw.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        return calendar.date(from: components)
    }

    /// "1,540" — grouped, because four digits without a separator reads as a
    /// year rather than a count.
    static func formatted(_ days: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: days)) ?? String(days)
    }
}

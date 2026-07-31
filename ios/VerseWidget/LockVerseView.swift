// LockVerseView.swift — the Lock Screen widget's visuals.
// PURE SwiftUI (no WidgetKit import) so it renders off device with ImageRenderer,
// which is the only way to check the layout at its real size without a phone.
// From design_handoff "Pamwe Verse Widget (2b, 2c)".
//
// A note on colour: the Lock Screen renders widgets in WidgetKit's vibrant mode,
// which flattens whatever you draw into the system's monochrome material. The
// Pamwe palette would simply be desaturated away, so this view is built in
// .primary / .secondary and relies on the system for contrast. That is also why
// the mock's tint, blur and text-shadow values are not here: iOS owns them.

import SwiftUI

/// accessoryRectangular is roughly 172 x 76pt, about half the width the mock is
/// drawn at, so the header cannot always hold both the reference and the
/// counter. These are the three shapes it degrades through.
struct LockVerseView: View {
    let verse: Verse
    /// Days together, or nil before the app has shared an anniversary. Nil is
    /// the ordinary state on a fresh install, not an error.
    let days: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            header
            // `short` rather than `full`: three lines at ~26 characters is the
            // real budget here, and `short` is already cut to 85.
            Text(verse.short)
                .font(WidgetFont.verseUpright(12.5))
                .lineSpacing(1)
                .lineLimit(3)
                // Three lines holds about 80 characters and `short` is capped at
                // 85, so the longest few need to shrink slightly. Shrinking is
                // the better failure here: a clipped verse reads as a mistake.
                .minimumScaleFactor(0.78)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // MARK: - Header

    private var header: some View {
        // Widest first. ViewThatFits measures each candidate's ideal width, which
        // is why the labels are .fixedSize(): it has to compare real text widths,
        // not the widths they would shrink to.
        //
        // The mock puts the full reference and "1,540 days together" on one line,
        // which needs about 200pt. At the real ~164pt of usable width that never
        // fits, so the ladder gives up the counter's words first, then the
        // book's full name, and only drops the counter when even "Eccl. 4:9" and
        // "1,540d" cannot share the line.
        ViewThatFits(in: .horizontal) {
            if let days {
                let count = SharedData.formatted(days)
                headerRow(reference: verse.ref, counter: "\(count) days together")
                headerRow(reference: verse.ref, counter: "\(count) days")
                headerRow(reference: verse.abbr, counter: "\(count) days")
                headerRow(reference: verse.abbr, counter: "\(count)d")
            }
            headerRow(reference: verse.ref, counter: nil)
        }
        .font(WidgetFont.label(9))
        .tracking(0.9)                 // 0.1em at 9pt
        .textCase(.uppercase)
        .foregroundStyle(.secondary)
    }

    private func headerRow(reference: String, counter: String?) -> some View {
        HStack(spacing: 5) {
            Circle()
                .frame(width: 5, height: 5)
            Text(reference)
                .fixedSize()
            if let counter {
                Spacer(minLength: 6)
                Text(counter)
                    .fixedSize()
            }
        }
        // The last candidate is the one that must never overflow, so it is the
        // only one allowed to truncate.
        .lineLimit(1)
    }
}

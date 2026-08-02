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
/// counter. When it cannot, the reference gives way and the relationship line
/// stays.
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
        // The old ladder gave up the counter's WORDS first, so on most phones it
        // rendered "126 DAYS" and eventually just "126D": a number on a lock
        // screen with nothing saying what it counted. The phrase is the whole
        // point of the counter, so it never degrades; the REFERENCE gives way
        // instead. Tapping opens the exact verse either way, since the deep
        // link carries book and chapter.
        //
        // Type size is per rung, because it is the only lever the Lock Screen
        // gives us: iOS fixes accessoryRectangular at roughly 172x76 and there
        // is no larger family to ask for. Carrying BOTH the reference and the
        // counter needs 8pt with tight tracking; at the 9pt/0.9 an eyebrow uses
        // everywhere else in the app, only very short references fit and most
        // verses lost their reference entirely.
        //
        // So the crowded rungs shrink and the roomy ones do not. A rung showing
        // one thing has space to spare, and there is no reason to make it small
        // as well. Measured off device with the bundled fonts: the worst
        // pairing in verses.json ("1 Chron. 16:34" beside "IN LOVE 12,540
        // DAYS") fits at 8pt with the verse keeping all three lines.
        ViewThatFits(in: .horizontal) {
            if let days {
                let phrase = days == 1 ? "In love 1 day" : "In love \(SharedData.formatted(days)) days"
                headerRow(reference: verse.ref, counter: phrase, compact: true)
                headerRow(reference: verse.abbr, counter: phrase, compact: true)
                headerRow(reference: nil, counter: phrase, compact: false)
            }
            headerRow(reference: verse.ref, counter: nil, compact: false)
        }
        .textCase(.uppercase)
        .foregroundStyle(.secondary)
    }

    /// `compact` is for the rungs carrying both labels: smaller type, tighter
    /// tracking, and a smaller bullet and gaps, which at this size were costing
    /// more of the line than the words were.
    private func headerRow(reference: String?, counter: String?, compact: Bool) -> some View {
        HStack(spacing: compact ? 4 : 5) {
            Circle()
                .frame(width: compact ? 4 : 5, height: compact ? 4 : 5)
            if let reference {
                Text(reference)
                    .fixedSize()
            }
            if let counter {
                if reference != nil { Spacer(minLength: compact ? 5 : 6) }
                Text(counter)
                    .fixedSize()
            }
        }
        // Applied here rather than on the ViewThatFits so each candidate is
        // MEASURED at the size it will actually render at.
        .font(WidgetFont.label(compact ? 8 : 9))
        .tracking(compact ? 0.2 : 0.9)
        // The last candidate is the one that must never overflow, so it is the
        // only one allowed to truncate.
        .lineLimit(1)
    }
}

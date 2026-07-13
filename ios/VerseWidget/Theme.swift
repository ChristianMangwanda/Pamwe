// Theme.swift — color + font tokens for the Verse of the Day widget.
// Pure SwiftUI (no WidgetKit) so the view can be snapshot-rendered off device.
// Values mirror widgets/Verse of the Day Widget.html (.w-light / .w-dark).

import SwiftUI

extension Color {
    init(hex: UInt) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

/// Which of the three widget families we are drawing.
enum WidgetSize {
    case small, medium, large
}

/// Warm cream (light) / deep near-black (dark), straight from the design mock.
struct Palette {
    let verse: Color        // body verse text
    let ref: Color          // reference line
    let eyebrow: Color      // "Verse of the day" + tick marks
    let gradTop: Color       // 157deg linear gradient stops
    let gradMid: Color
    let gradBot: Color
    let glow: Color         // top-left radial wash
    let verseHalo: Color    // soft glow behind the verse for legibility over the tree
    let treeOpacity: Double

    static func of(_ scheme: ColorScheme) -> Palette {
        scheme == .dark ? .dark : .light
    }

    static let light = Palette(
        verse: Color(hex: 0x33251A),
        ref: Color(hex: 0x93502F),
        eyebrow: Color(hex: 0x9B5651),
        gradTop: Color(hex: 0xFBF4E6),
        gradMid: Color(hex: 0xF4E9D3),
        gradBot: Color(hex: 0xEFE2CB),
        glow: Color(hex: 0xFFF7E6),
        verseHalo: Color(hex: 0xFBF4E6),
        treeOpacity: 0.30
    )

    static let dark = Palette(
        verse: Color(hex: 0xF1E8D8),
        ref: Color(hex: 0xE7AA9C),
        eyebrow: Color(hex: 0xE0A08F),
        gradTop: Color(hex: 0x241B13),
        gradMid: Color(hex: 0x1A140D),
        gradBot: Color(hex: 0x150F0A),
        glow: Color(hex: 0x3A2A1D),
        verseHalo: Color(hex: 0x120C08),
        treeOpacity: 0.30
    )
}

/// The two faces the widget actually uses (referenced by PostScript name).
enum WidgetFont {
    static func verse(_ size: CGFloat) -> Font { .custom("Fraunces-Italic", size: size) }
    static func label(_ size: CGFloat) -> Font { .custom("InstrumentSans-SemiBold", size: size) }
}

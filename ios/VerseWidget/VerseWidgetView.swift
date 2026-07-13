// VerseWidgetView.swift — the widget's visuals. PURE SwiftUI (no WidgetKit import)
// so it can be rendered off device with ImageRenderer for design review.
// Layouts follow the notes in widgets/Verse of the Day Widget.html.

import SwiftUI

// MARK: - Background (gradients + faint tree emblem)

/// Goes behind the content. In the widget this is supplied to
/// `.containerBackground(for: .widget)`; the snapshot host stacks it directly.
struct WidgetBackground: View {
    let size: WidgetSize
    let tree: Image
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        GeometryReader { geo in
            layers(geo)
        }
        .ignoresSafeArea()
    }

    private func layers(_ geo: GeometryProxy) -> some View {
        let p = Palette.of(scheme)
        return ZStack {
            LinearGradient(
                stops: [
                    .init(color: p.gradTop, location: 0.0),
                    .init(color: p.gradMid, location: 0.62),
                    .init(color: p.gradBot, location: 1.0),
                ],
                startPoint: UnitPoint(x: 0.30, y: 0.0),
                endPoint: UnitPoint(x: 0.70, y: 1.0)
            )
            RadialGradient(
                colors: [p.glow, p.glow.opacity(0)],
                center: UnitPoint(x: 0.20, y: 0.04),
                startRadius: 0,
                endRadius: geo.size.width * 0.92
            )
            tree
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: geo.size.height * treeScale)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .offset(y: geo.size.height * treeOffsetY)
                .opacity(p.treeOpacity)
        }
    }

    // The tree overflows the frame so it reads as a rooted emblem, not a sticker.
    private var treeScale: CGFloat {
        switch size {
        case .small: return 1.18
        case .medium: return 1.34
        case .large: return 1.02
        }
    }

    private var treeOffsetY: CGFloat {
        switch size {
        case .small: return 0.02
        case .medium: return -0.02
        case .large: return -0.05
        }
    }
}

// MARK: - Content (eyebrow / verse / reference)

struct WidgetContent: View {
    let verse: Verse
    let size: WidgetSize
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        switch size {
        case .small: smallBody()
        case .medium: mediumBody()
        case .large: largeBody()
        }
    }

    // Small: short line + reference, seated at the bottom, tree faint behind.
    private func smallBody() -> some View {
        let p = Palette.of(scheme)
        return VStack(spacing: 9) {
            Spacer(minLength: 0)
            Text(verse.short)
                .font(WidgetFont.verse(15))
                .foregroundColor(p.verse)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
                .lineLimit(4)
                .minimumScaleFactor(0.7)
                .shadow(color: p.verseHalo.opacity(0.9), radius: 6)
            reference(p, fontSize: 9, tracking: 1.1)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 15)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }

    // Medium: eyebrow, three-line verse, reference. All centered.
    private func mediumBody() -> some View {
        let p = Palette.of(scheme)
        return VStack(spacing: 0) {
            eyebrow(p, fontSize: 9.5)
            Text(verse.full)
                .font(WidgetFont.verse(15.5))
                .foregroundColor(p.verse)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .lineLimit(3)
                .minimumScaleFactor(0.65)
                .shadow(color: p.verseHalo.opacity(0.9), radius: 7)
                .padding(.top, 11)
            reference(p, fontSize: 10, tracking: 1.3)
                .padding(.top, 13)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    // Large: eyebrow pinned top, generous verse, reference at the bottom.
    private func largeBody() -> some View {
        let p = Palette.of(scheme)
        return VStack(spacing: 0) {
            eyebrow(p, fontSize: 11)
            Spacer(minLength: 0)
            Text(verse.full)
                .font(WidgetFont.verse(27))
                .foregroundColor(p.verse)
                .multilineTextAlignment(.center)
                .lineSpacing(8)
                .lineLimit(6)
                .minimumScaleFactor(0.6)
                .shadow(color: p.verseHalo.opacity(0.9), radius: 9)
            Spacer(minLength: 0)
            reference(p, fontSize: 12, tracking: 1.8)
        }
        .padding(.horizontal, 34)
        .padding(.vertical, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    // MARK: pieces

    private func eyebrow(_ p: Palette, fontSize: CGFloat) -> some View {
        HStack(spacing: 8) {
            tick(p)
            Text("Verse of the day".uppercased())
                .font(WidgetFont.label(fontSize))
                .tracking(fontSize * 0.2)
                .foregroundColor(p.eyebrow)
            tick(p)
        }
    }

    private func tick(_ p: Palette) -> some View {
        Capsule()
            .fill(p.eyebrow)
            .frame(width: 16, height: 1.5)
            .opacity(0.55)
    }

    private func reference(_ p: Palette, fontSize: CGFloat, tracking: CGFloat) -> some View {
        Text(verse.ref.uppercased())
            .font(WidgetFont.label(fontSize))
            .tracking(tracking)
            .foregroundColor(p.ref)
    }
}

// MARK: - Composed surface (snapshot host + previews use this)

struct VerseWidgetSurface: View {
    let verse: Verse
    let size: WidgetSize
    let tree: Image

    var body: some View {
        ZStack {
            WidgetBackground(size: size, tree: tree)
            WidgetContent(verse: verse, size: size)
        }
    }
}

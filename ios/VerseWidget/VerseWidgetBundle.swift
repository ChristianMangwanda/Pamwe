// VerseWidgetBundle.swift — the extension entry point.

import WidgetKit
import SwiftUI

@main
struct VerseWidgetBundle: WidgetBundle {
    var body: some Widget {
        VerseWidget()      // Home Screen, small / medium / large
        LockVerseWidget()  // Lock Screen, accessoryRectangular
    }
}

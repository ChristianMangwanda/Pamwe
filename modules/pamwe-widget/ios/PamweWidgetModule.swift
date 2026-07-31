// The one piece of couple state the widgets are allowed to see.
//
// The Home Screen "Verse of the Day" widget is deliberately self-contained: it
// bundles verses.json and needs nothing from the app. The Lock Screen widget
// adds one thing that cannot be bundled, the couple's anniversary, so this
// module writes that single date into the shared App Group and asks WidgetKit
// to redraw. Nothing else crosses: no reflections, no prayers, no session.

import ExpoModulesCore
import WidgetKit

// Must match both .entitlements files. A typo here is silent at build time and
// shows up only as a widget that never gets a counter.
private let appGroup = "group.com.christianmangwanda.pamwe"
private let anniversaryKey = "anniversary"

public class PamweWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PamweWidget")

    // ISO 'YYYY-MM-DD', or nil to clear it. Kept as the raw calendar day rather
    // than a timestamp so the widget counts local days without a timezone to
    // reason about.
    Function("setAnniversary") { (anniversary: String?) -> Void in
      guard let defaults = UserDefaults(suiteName: appGroup) else { return }
      if let anniversary, !anniversary.isEmpty {
        defaults.set(anniversary, forKey: anniversaryKey)
      } else {
        defaults.removeObject(forKey: anniversaryKey)
      }
      WidgetCenter.shared.reloadAllTimelines()
    }

    // Lets the app avoid a pointless widget reload when nothing changed.
    Function("getAnniversary") { () -> String? in
      UserDefaults(suiteName: appGroup)?.string(forKey: anniversaryKey)
    }
  }
}

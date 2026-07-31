# Adds the "VerseWidget" WidgetKit app-extension target to ios/Pamwe.xcodeproj.
#
# The ios/ project is hand-maintained (never `expo prebuild`), so we splice the
# target in programmatically with the xcodeproj gem that ships inside Homebrew
# CocoaPods. Run it via:
#
#   LIBEXEC=$(dirname "$(dirname "$(readlink -f "$(brew --prefix cocoapods)/bin/pod")")")  # or hard-coded below
#   GEM_HOME=/opt/homebrew/Cellar/cocoapods/<ver>/libexec \
#     /opt/homebrew/opt/ruby/bin/ruby scripts/add_widget_target.rb
#
# Idempotent: creates the target once, then on every run re-asserts the file
# lists and the embed-phase position, so a project that has drifted self-heals
# and adding a Swift file below is enough to get it compiled. The widget uses
# only system frameworks (WidgetKit/SwiftUI auto-link via `import`), so it is NOT
# added to the Podfile and `pod install` leaves it untouched.
require "xcodeproj"

ROOT         = File.expand_path("..", __dir__)
PROJECT_PATH = File.join(ROOT, "ios", "Pamwe.xcodeproj")
WIDGET_NAME  = "VerseWidget"
APP_NAME     = "Pamwe"
BUNDLE_ID    = "com.christianmangwanda.pamwe.VerseWidget"
TEAM         = "5LX4YFCXPK"

# Everything the appex compiles and carries. Paths are relative to ios/VerseWidget.
SOURCES = %w[
  VerseWidgetBundle.swift
  VerseWidget.swift
  VerseWidgetView.swift
  LockVerseWidget.swift
  LockVerseView.swift
  SharedData.swift
  Theme.swift
  VerseData.swift
].freeze
RESOURCES = %w[
  verses.json
  Assets.xcassets
  Fonts/Fraunces_400Regular_Italic.ttf
  Fonts/Fraunces_400Regular.ttf
  Fonts/InstrumentSans_600SemiBold.ttf
].freeze

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == APP_NAME }
raise "App target #{APP_NAME} not found" unless app_target

# The script is idempotent: it creates the target once, then always re-asserts the
# embed-phase position (see step 4) so a partially-set-up project self-heals.
widget = project.targets.find { |t| t.name == WIDGET_NAME }
fresh  = widget.nil?

if fresh
  # 1. Extension target (creates default Debug/Release configs + build phases).
  widget = project.new_target(:app_extension, WIDGET_NAME, :ios, "17.0", nil, :swift)

  # 3. Build settings (both configurations). Version fields mirror the app so the
  #    embedded appex passes Apple's "bundle versions must match" check. The build
  #    number is read from the app target so a fresh re-splice can't drift from it.
  #    (Release bumps still edit all 4 pbxproj spots directly; see CLAUDE.md.)
  app_version = app_target.build_configurations
                          .map { |c| c.build_settings["CURRENT_PROJECT_VERSION"] }
                          .compact.first || "1"
  widget.build_configurations.each do |config|
    bs = config.build_settings
    bs["PRODUCT_BUNDLE_IDENTIFIER"]  = BUNDLE_ID
    bs["PRODUCT_NAME"]               = "$(TARGET_NAME)"
    bs["INFOPLIST_FILE"]             = "VerseWidget/Info.plist"
    # App Group, shared with the app so the Lock Screen widget can read the
    # couple's anniversary. Dropping this line does not fail the build: the
    # widget just stops finding the suite and quietly hides its counter.
    bs["CODE_SIGN_ENTITLEMENTS"]     = "VerseWidget/VerseWidget.entitlements"
    bs["GENERATE_INFOPLIST_FILE"]    = "NO"
    bs["IPHONEOS_DEPLOYMENT_TARGET"] = "17.0"
    bs["TARGETED_DEVICE_FAMILY"]     = "1,2"
    bs["SWIFT_VERSION"]              = "5.0"
    bs["CURRENT_PROJECT_VERSION"]    = app_version   # mirror the app target
    bs["MARKETING_VERSION"]          = "1.0"
    bs["DEVELOPMENT_TEAM"]           = TEAM
    bs["CODE_SIGN_STYLE"]            = "Automatic"
    bs["SKIP_INSTALL"]               = "YES"  # embedded via the app, not installed standalone
    bs["LD_RUNPATH_SEARCH_PATHS"]    = "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"
    bs["SWIFT_EMIT_LOC_STRINGS"]     = "YES"
  end

  app_target.add_dependency(widget)
end

# 2. Group + file references (paths are relative to ios/). Re-asserted every run:
#    the arrays above are the source of truth, so a new Swift file is picked up
#    by editing SOURCES and re-running, with no Xcode GUI step.
group = project.main_group.find_subpath(WIDGET_NAME, true)
group.set_source_tree("<group>")
group.set_path(WIDGET_NAME)

def sync_phase(group, phase, paths)
  # Compare on `path`, which is exactly what the arrays above hold. hierarchy_path
  # looks right but reports the basename for nested entries, so "Fonts/x.ttf" and
  # "x.ttf" would never match and every run would add a second copy.
  have = phase.files_references.map(&:path)
  paths.each do |path|
    next if have.include?(path)
    ref = group.files.find { |f| f.path == path } || group.new_reference(path)
    phase.add_file_reference(ref)
  end
end

sync_phase(group, widget.source_build_phase, SOURCES)
sync_phase(group, widget.resources_build_phase, RESOURCES)
group.new_reference("Info.plist") if group.files.none? { |f| f.path == "Info.plist" }

# 4. Embed the appex into the app, positioned RIGHT AFTER the Frameworks phase.
#    It must run before the whole-app-bundle steps (Strip Local Network Keys,
#    ProcessInfoPlist, ExtractAppIntentsMetadata) or the build system reports
#    "Cycle inside Pamwe" (the appex lands in Pamwe.app/PlugIns, which those steps
#    scan). Appending it last is what triggers the cycle.
embed = app_target.copy_files_build_phases.find { |ph| ph.symbol_dst_subfolder_spec == :plug_ins }
if embed.nil?
  embed = app_target.new_copy_files_build_phase("Embed App Extensions")
  embed.symbol_dst_subfolder_spec = :plug_ins
end
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference, true)
  bf.settings = { "ATTRIBUTES" => %w[RemoveHeadersOnCopy CodeSignOnCopy] }
end
target_index = app_target.build_phases.index(app_target.frameworks_build_phase) + 1
if app_target.build_phases.index(embed) != target_index
  app_target.build_phases.delete(embed)
  app_target.build_phases.insert(target_index, embed)
end

project.save

# ---- verification output ----
puts(fresh ? "Added #{WIDGET_NAME} target." : "#{WIDGET_NAME} exists; re-asserted embed phase.")
puts "Sources:   #{widget.source_build_phase.files_references.map(&:display_name).join(', ')}"
puts "Resources: #{widget.resources_build_phase.files_references.map(&:display_name).join(', ')}"
puts "Embed phase files: #{embed.files_references.map(&:display_name).join(', ')}"
puts "Embed phase index: #{app_target.build_phases.index(embed)} (frameworks at #{app_target.build_phases.index(app_target.frameworks_build_phase)})"
puts "Dependencies of #{APP_NAME}: #{app_target.dependencies.map { |d| d.target.name }.join(', ')}"

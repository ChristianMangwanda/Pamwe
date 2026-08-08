# Restores every hand-made patch that lives inside the gitignored ios/ project.
#
# ios/ is not in git, so a regenerated project (a stray `expo prebuild`, a fresh
# clone, a `rm -rf ios && npx expo run:ios`) silently reverts these. None of them
# fail loudly at build time: the worst one ships a Release archive pointed at the
# LAN dev stack, which builds, signs, uploads and then reaches nothing.
#
# Run it via CocoaPods' bundled xcodeproj gem, same as add_widget_target.rb:
#
#   GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec \
#     /opt/homebrew/opt/ruby/bin/ruby scripts/restore_ios_patches.rb
#
#   --check        report drift and exit 1, change nothing (use before an archive)
#   --skip-widget  don't chain to add_widget_target.rb
#
# Idempotent: on an already-correct project it writes nothing and leaves the
# pbxproj byte-identical. The canonical copies live in scripts/ios/, which IS in
# git; this script only puts them back and rewires them.

require "xcodeproj"
require "fileutils"

ROOT         = File.expand_path("..", __dir__)
PROJECT_PATH = File.join(ROOT, "ios", "Pamwe.xcodeproj")
CANON        = File.join(__dir__, "ios")
APP_TARGET   = "Pamwe"
WIDGET       = "VerseWidget"
BUNDLE_PHASE = "Bundle React Native code and images"

CHECK_ONLY  = ARGV.include?("--check")
SKIP_WIDGET = ARGV.include?("--skip-widget")

# Purpose strings. The photo one is mirrored in app.json, but the mic and speech
# strings exist ONLY here and as plugin props that apply solely via the banned
# prebuild, so this file is their durable home. Apple rejects an archive that
# references the API without the string, and a rejected build number is burned.
PURPOSE_STRINGS = {
  "NSMicrophoneUsageDescription" =>
    "Pamwe needs microphone access to record your voice reflections.",
  "NSSpeechRecognitionUsageDescription" =>
    "Pamwe transcribes your voice reflections on this phone so they stay readable and searchable.",
  "NSPhotoLibraryUsageDescription" =>
    "Pamwe does not access your photos. A component the app includes references this permission, so Apple requires this notice.",
}.freeze

$drift = []
$fixed = []

def ok(msg)    = puts("  ok      #{msg}")
def drift(msg)
  $drift << msg
  puts("  DRIFT   #{msg}")
end
def fixed(msg)
  $fixed << msg
  puts("  fixed   #{msg}")
end

# Applies a change unless --check, and records which happened either way.
def repair(msg)
  if CHECK_ONLY
    drift(msg)
  else
    yield
    fixed(msg)
  end
end

abort "error: #{PROJECT_PATH} not found. Nothing to restore." unless Dir.exist?(PROJECT_PATH)

project = Xcodeproj::Project.open(PROJECT_PATH)
app     = project.targets.find { |t| t.name == APP_TARGET }
abort "error: no #{APP_TARGET} target in the project." unless app

# ---------------------------------------------------------------------------
# 1. Canonical files back onto disk
# ---------------------------------------------------------------------------
puts "\nFiles"
{
  "PrivacyInfo.xcprivacy" => File.join(ROOT, "ios", "Pamwe", "PrivacyInfo.xcprivacy"),
  "Pamwe.entitlements"    => File.join(ROOT, "ios", "Pamwe", "Pamwe.entitlements"),
}.each do |name, dest|
  src = File.join(CANON, name)
  abort "error: canonical #{src} is missing." unless File.exist?(src)

  if File.exist?(dest) && File.read(dest) == File.read(src)
    ok name
  else
    label = File.exist?(dest) ? "#{name} differs from scripts/ios/#{name}" : "#{name} is missing"
    repair(label) do
      FileUtils.mkdir_p(File.dirname(dest))
      FileUtils.cp(src, dest)
    end
  end
end

# ---------------------------------------------------------------------------
# 2. The bundle phase: NODE_ENV/.env.production branch + the Sentry wrapper
#
# The one that ships a broken archive quietly. Expo's stock phase has neither
# the else-branch that pins Release to .env.production (without it the bundler
# loads .env, the LOCAL stack) nor the sentry-xcode.sh wrapper that uploads
# source maps.
# ---------------------------------------------------------------------------
puts "\nBundle phase"
canonical_script = File.read(File.join(CANON, "bundle-phase.sh"))
phase = app.build_phases.find { |p| p.respond_to?(:shell_script) && p.name == BUNDLE_PHASE }

if phase.nil?
  drift "no \"#{BUNDLE_PHASE}\" phase on #{APP_TARGET} (cannot restore automatically)"
elsif phase.shell_script == canonical_script
  ok "shellScript matches scripts/ios/bundle-phase.sh"
else
  missing = []
  missing << "NODE_ENV=production branch" unless phase.shell_script.include?("export NODE_ENV=production")
  missing << ".env.production guard"      unless phase.shell_script.include?(".env.production")
  missing << "Sentry wrapper"             unless phase.shell_script.include?("sentry-xcode.sh")
  detail = missing.empty? ? "shellScript differs" : "shellScript is missing: #{missing.join(', ')}"
  repair(detail) { phase.shell_script = canonical_script }
end

# ---------------------------------------------------------------------------
# 3. PrivacyInfo.xcprivacy wired into the app's Resources phase
# ---------------------------------------------------------------------------
puts "\nPrivacy manifest"
in_resources = app.resources_build_phase.files.any? do |f|
  f.file_ref&.path.to_s.end_with?("PrivacyInfo.xcprivacy")
end

if in_resources
  ok "in the #{APP_TARGET} Resources phase"
else
  repair("PrivacyInfo.xcprivacy is not in the #{APP_TARGET} Resources phase") do
    group = project.main_group.find_subpath(APP_TARGET, true)
    ref   = group.files.find { |f| f.path.to_s.end_with?("PrivacyInfo.xcprivacy") } ||
            group.new_reference("PrivacyInfo.xcprivacy")
    app.resources_build_phase.add_file_reference(ref, true)
  end
end

# ---------------------------------------------------------------------------
# 4. Entitlements wiring (push, Sign in with Apple, the widget's App Group)
#
# A missing App Group is silent: the lock-screen widget just reads an empty
# suite and drops the "In love N days" line with no error anywhere.
# ---------------------------------------------------------------------------
puts "\nEntitlements"
{
  APP_TARGET => "Pamwe/Pamwe.entitlements",
  WIDGET     => "VerseWidget/VerseWidget.entitlements",
}.each do |target_name, expected|
  target = project.targets.find { |t| t.name == target_name }
  if target.nil?
    puts "  skip    #{target_name} target not present"
    next
  end

  wrong = target.build_configurations.reject { |c| c.build_settings["CODE_SIGN_ENTITLEMENTS"] == expected }
  if wrong.empty?
    ok "#{target_name} -> #{expected}"
  else
    repair("#{target_name} CODE_SIGN_ENTITLEMENTS wrong in: #{wrong.map(&:name).join(', ')}") do
      wrong.each { |c| c.build_settings["CODE_SIGN_ENTITLEMENTS"] = expected }
    end
  end
end

# ---------------------------------------------------------------------------
# 5. Info.plist: $(CURRENT_PROJECT_VERSION) wiring + purpose strings
#
# The 2026-07-11 prebuild reset CFBundleVersion to a literal 1 and stripped
# NSPhotoLibraryUsageDescription, which burned build 10 at Apple processing.
# ---------------------------------------------------------------------------
puts "\nInfo.plist"
plist_rel  = app.build_configurations.first.build_settings["INFOPLIST_FILE"] || "Pamwe/Info.plist"
plist_path = File.join(ROOT, "ios", plist_rel)

if !File.exist?(plist_path)
  drift "#{plist_rel} not found"
else
  plist   = Xcodeproj::Plist.read_from_path(plist_path)
  pending = []

  if plist["CFBundleVersion"] == "$(CURRENT_PROJECT_VERSION)"
    ok "CFBundleVersion = $(CURRENT_PROJECT_VERSION)"
  else
    pending << -> { plist["CFBundleVersion"] = "$(CURRENT_PROJECT_VERSION)" }
    drift "CFBundleVersion is #{plist['CFBundleVersion'].inspect}, not $(CURRENT_PROJECT_VERSION)" if CHECK_ONLY
  end

  PURPOSE_STRINGS.each do |key, value|
    if plist[key].nil? || plist[key].to_s.empty?
      pending << -> { plist[key] = value }
      drift "#{key} is missing" if CHECK_ONLY
    elsif plist[key] != value
      # Reworded on purpose, most likely. Say so, don't overwrite the copy.
      puts "  note    #{key} differs from the canonical wording (left alone)"
    else
      ok key
    end
  end

  if pending.any? && !CHECK_ONLY
    pending.each(&:call)
    Xcodeproj::Plist.write_to_path(plist, plist_path)
    fixed "#{plist_rel} (#{pending.size} key#{'s' if pending.size != 1})"
  end
end

# ---------------------------------------------------------------------------
# 6. CURRENT_PROJECT_VERSION agreement
#
# Apple rejects a build whose embedded appex CFBundleVersion differs from the
# app's, so the app's 2 configs and the widget's 2 must all carry one number.
# This only reports: which number is correct is a release decision.
# ---------------------------------------------------------------------------
puts "\nBuild number"
versions = project.targets.flat_map do |t|
  t.build_configurations.map { |c| [t.name, c.name, c.build_settings["CURRENT_PROJECT_VERSION"]] }
end.reject { |_, _, v| v.nil? }

distinct = versions.map(&:last).uniq
if distinct.size == 1
  ok "all #{versions.size} configs at #{distinct.first}"
else
  versions.each { |t, c, v| puts "          #{t}/#{c} = #{v}" }
  drift "CURRENT_PROJECT_VERSION disagrees (#{distinct.join(' vs ')}); Apple will reject the archive"
end

# ---------------------------------------------------------------------------
project.save unless CHECK_ONLY

# ---------------------------------------------------------------------------
# 7. The widget target (its own script, already the precedent)
# ---------------------------------------------------------------------------
unless SKIP_WIDGET || CHECK_ONLY
  puts "\nWidget target"
  if project.targets.any? { |t| t.name == WIDGET }
    ok "#{WIDGET} target present (re-run scripts/add_widget_target.rb to re-assert its file lists)"
  else
    drift "#{WIDGET} target missing"
    puts "          run: GEM_HOME=$GEM_HOME ruby scripts/add_widget_target.rb && (cd ios && pod install)"
  end
end

# ---------------------------------------------------------------------------
puts "\n" + "-" * 60
if CHECK_ONLY
  if $drift.empty?
    puts "ios/ carries every hand-made patch."
    exit 0
  end
  puts "#{$drift.size} thing#{'s' if $drift.size != 1} to restore. Re-run without --check."
  exit 1
elsif $fixed.empty? && $drift.empty?
  puts "Nothing to do: ios/ already carries every hand-made patch."
else
  puts "Restored #{$fixed.size} thing#{'s' if $fixed.size != 1}." if $fixed.any?
  $drift.each { |d| puts "Still wrong (needs a human): #{d}" }
  puts "\nThese are NOT restored by this script:"
  puts "  ios/sentry.properties  (org auth token, from the Sentry dashboard)"
  puts "  .env.production        (rebuild from env.hosted.backup)"
  puts "  cd ios && pod install"
  exit 1 if $drift.any?
end

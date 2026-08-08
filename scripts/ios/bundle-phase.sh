if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# The project root by default is one level up from the ios directory
export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
else
  # This phase invokes @expo/cli build entry directly, bypassing the expo
  # bin wrapper that sets NODE_ENV, so @expo/env falls back to .env, which
  # is the LOCAL stack, and Release ships a build that can reach nothing.
  # Setting NODE_ENV alone did not survive to the bundler, so export the
  # production values outright: @expo/env leaves variables already in the
  # environment alone, so these win whatever it decides to load.
  # Found 2026-08-08 by grepping the archive; see trial-and-error.md.
  export NODE_ENV=production
  if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
    echo "error: .env.production is missing, so Release would bundle the LOCAL Supabase stack" >&2
    exit 1
  fi
  set -a
  . "$PROJECT_ROOT/.env.production"
  set +a
fi
if [[ -z "$ENTRY_FILE" ]]; then
  # Set the entry JS file using the bundler's entry resolution.
  export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios absolute | tail -n 1)"
fi

if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

# Source .xcode.env.updates if it exists to allow
# SKIP_BUNDLING to be unset if needed
if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  source "$PODS_ROOT/../.xcode.env.updates"
fi
# Source local changes to allow overrides
# if needed
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# Wrap the RN bundle step with Sentry so JS source maps upload with each
# archive. A failed or unauthenticated upload must not burn a build number,
# so the build continues without maps instead of failing
# (SENTRY_ALLOW_FAILURE). Auth and project live in ios/sentry.properties
# (gitignored; a fresh clone must recreate it).
export SENTRY_ALLOW_FAILURE=true
RN_XCODE=`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"`
SENTRY_XCODE=`"$NODE_BINARY" --print "require('path').dirname(require.resolve('@sentry/react-native/package.json')) + '/scripts/sentry-xcode.sh'"`
/bin/sh "$SENTRY_XCODE" "$RN_XCODE"
BUNDLE_STATUS=$?

# SENTRY_ALLOW_FAILURE is broader than it sounds: sentry-cli wraps the WHOLE
# bundle step, not just the source-map upload. A bundler CRASH therefore prints
# "Source maps upload failed, but continuing build", the archive reports
# ** ARCHIVE SUCCEEDED ** with no main.jsbundle inside the .app, and the binary
# uploads, signs, installs and launches to a red screen.
#
# react-native-xcode.sh guards this exact case itself, but its guard runs INSIDE
# the wrapper, so the wrapper swallows that too. Re-assert it out here, where
# nothing can catch it. Skipped when SKIP_BUNDLING is set (Debug), the one case
# where producing no bundle is correct.
if [[ -z "$SKIP_BUNDLING" ]]; then
  BUNDLE_OUT="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/${BUNDLE_NAME:-main}.jsbundle"
  if [[ ! -s "$BUNDLE_OUT" ]]; then
    echo "error: no JavaScript bundle at $BUNDLE_OUT. The bundler failed and SENTRY_ALLOW_FAILURE swallowed it. This archive would launch to a red screen, so failing the build instead." >&2
    exit 1
  fi
fi

exit $BUNDLE_STATUS

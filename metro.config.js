// Sentry's wrapper around Expo's default Metro config — injects debug IDs
// so crash stack traces can be symbolicated once source maps are uploaded.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);

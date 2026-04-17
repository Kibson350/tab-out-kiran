#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$REPO_DIR/.build"

echo "Pulling latest..."
git -C "$REPO_DIR" pull

echo "Building..."
xcodebuild \
  -project "$REPO_DIR/Tab Out/Tab Out.xcodeproj" \
  -scheme "Tab Out (macOS)" \
  -configuration Release \
  -destination "platform=macOS" \
  -derivedDataPath "$BUILD_DIR" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="E0800CB105B660F6D225AA60CEF505987D84ECAC" \
  DEVELOPMENT_TEAM=P25N5S9P89 \
  PROVISIONING_PROFILE_SPECIFIER="" \
  build 2>&1 | grep -E "error:|warning:|BUILD SUCCEEDED|BUILD FAILED"

APP="$BUILD_DIR/Build/Products/Release/Tab Out.app"
echo "Installing..."
pkill -x "Tab Out" 2>/dev/null || true
cp -Rf "$APP" /Applications/
xattr -dr com.apple.quarantine "/Applications/Tab Out.app" 2>/dev/null || true
open "/Applications/Tab Out.app"
echo "✓ Tab Out updated — re-enable in Safari → Settings → Extensions"

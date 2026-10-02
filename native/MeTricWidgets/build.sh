#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$DIR/../.." && pwd )"
OUTPUT_DIR="$PROJECT_DIR/build/native/MeTricWidgets.appex"
SDK_PATH=$(xcrun --show-sdk-path --sdk macosx)

echo "==> Building MeTricWidgets.appex..."
mkdir -p "$OUTPUT_DIR/Contents/MacOS"
mkdir -p "$OUTPUT_DIR/Contents/Resources"

# Copy Info.plist
cp "$DIR/Resources/Info.plist" "$OUTPUT_DIR/Contents/Info.plist"

# Sources
SOURCES=(
  "$DIR/Sources/WidgetData.swift"
  "$DIR/Sources/SmallWidgetView.swift"
  "$DIR/Sources/MediumWidgetView.swift"
  "$DIR/Sources/MeTricWidgets.swift"
)

# Temporary compile build directory
BUILD_TMP="$DIR/.build_tmp"
mkdir -p "$BUILD_TMP"

echo "  -> Compiling arm64..."
swiftc \
  -parse-as-library \
  -target arm64-apple-macos14.0 \
  -sdk "$SDK_PATH" \
  -framework WidgetKit \
  -framework SwiftUI \
  -framework Foundation \
  -O \
  -o "$BUILD_TMP/MeTricWidgets_arm64" \
  "${SOURCES[@]}"

echo "  -> Compiling x86_64..."
swiftc \
  -parse-as-library \
  -target x86_64-apple-macos14.0 \
  -sdk "$SDK_PATH" \
  -framework WidgetKit \
  -framework SwiftUI \
  -framework Foundation \
  -O \
  -o "$BUILD_TMP/MeTricWidgets_x86_64" \
  "${SOURCES[@]}"

echo "  -> Creating universal Mach-O binary..."
lipo -create \
  "$BUILD_TMP/MeTricWidgets_arm64" \
  "$BUILD_TMP/MeTricWidgets_x86_64" \
  -output "$OUTPUT_DIR/Contents/MacOS/MeTricWidgets"

rm -rf "$BUILD_TMP"

echo "  -> Signing extension bundle with entitlements..."
codesign --force --sign - --entitlements "$DIR/Resources/MeTricWidgets.entitlements" "$OUTPUT_DIR"

echo "==> Successfully created $OUTPUT_DIR"
file "$OUTPUT_DIR/Contents/MacOS/MeTricWidgets"

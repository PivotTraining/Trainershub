#!/bin/bash
# Capture App Store screenshots from iOS simulators
# Usage: ./scripts/capture-screenshots.sh
#
# Required screenshot sizes:
#   6.7" (iPhone 17 Pro Max): 1320×2868 px
#   6.5" (iPhone 11 Pro Max): 1242×2688 px  [use 6.7" resized if device unavailable]

set -euo pipefail

UDID_67="A41ED02E-E8EE-4645-A9B4-A4DA7310434B"  # iPhone 17 Pro Max
BUNDLE="com.trainerhub.app"
RAW_DIR="screenshots/raw"
FINAL_DIR="screenshots/final"
APP_PATH="/tmp/TrainerHub-sim/Build/Products/Debug-iphonesimulator/TrainerHub.app"

mkdir -p "$RAW_DIR" "$FINAL_DIR"

echo "▶ Installing app on iPhone 17 Pro Max..."
xcrun simctl install "$UDID_67" "$APP_PATH"

echo "▶ Launching app..."
xcrun simctl launch "$UDID_67" "$BUNDLE"
sleep 4  # Wait for app to load

echo "▶ --- Capturing screenshots ---"
echo "  Navigate the app to each screen before each capture."
echo ""

screens=(
  "01-sign-in:Sign-In screen"
  "02-home:Trainer Home / Dashboard"
  "03-clients:Clients list"
  "04-schedule:Schedule / Sessions"
  "05-profile:Trainer Profile"
)

for screen in "${screens[@]}"; do
  key="${screen%%:*}"
  label="${screen##*:}"
  echo "  Prep: Navigate to [$label] then press Enter..."
  read -r
  xcrun simctl io "$UDID_67" screenshot "$RAW_DIR/${key}-67inch.png"
  echo "  ✓ Captured: $RAW_DIR/${key}-67inch.png"
done

echo ""
echo "▶ Resizing to App Store dimensions..."
./scripts/resize-screenshots.sh

echo ""
echo "✅ Done! Screenshots saved to $FINAL_DIR/"
ls -la "$FINAL_DIR/"

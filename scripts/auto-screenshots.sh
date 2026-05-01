#!/bin/bash
# Automated App Store screenshot capture for TrainerHub
# Waits for build, installs app, opens Simulator, then prompts you
# to navigate each screen before capturing.
#
# Run from TrainerHub/ root:
#   bash scripts/auto-screenshots.sh

set -euo pipefail

UDID="A41ED02E-E8EE-4645-A9B4-A4DA7310434B"   # iPhone 17 Pro Max
BUNDLE="com.trainerhub.app"
APP_PATH="/tmp/TrainerHub-sim/Build/Products/Debug-iphonesimulator/TrainerHub.app"
RAW="screenshots/raw"
FINAL_69="screenshots/final/6.9inch"
FINAL_65="screenshots/final/6.5inch"

mkdir -p "$RAW" "$FINAL_69" "$FINAL_65"

# ── 1. Wait for build ──────────────────────────────────────────────────────────
echo "⏳ Waiting for simulator build to finish..."
until [ -f "$APP_PATH/TrainerHub" ]; do
  sleep 3
done
echo "✅ Build complete."

# ── 2. Boot simulator ─────────────────────────────────────────────────────────
echo "▶ Booting iPhone 17 Pro Max..."
xcrun simctl boot "$UDID" 2>/dev/null || true
open -a Simulator
sleep 3

# ── 3. Install & launch app ───────────────────────────────────────────────────
echo "▶ Installing TrainerHub..."
xcrun simctl install "$UDID" "$APP_PATH"

echo "▶ Launching TrainerHub..."
xcrun simctl launch "$UDID" "$BUNDLE"
sleep 5

# ── 4. Capture each screen ────────────────────────────────────────────────────
capture() {
  local name="$1"
  local prompt="$2"
  echo ""
  echo "📱  $prompt"
  echo "    Press [Enter] when the screen is ready..."
  read -r
  xcrun simctl io "$UDID" screenshot "$RAW/${name}.png"
  echo "    ✓  Captured → $RAW/${name}.png"
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  App Store Screenshot Capture  (5 screens)"
echo "═══════════════════════════════════════════════"
echo ""
echo "The app should be open on the Sign-In screen."
echo "Use the Simulator to navigate between screens."
echo ""

capture "01-signin"     "Navigate to: Sign-In screen"
capture "02-dashboard"  "Sign in as TRAINER — go to Home/Dashboard tab"
capture "03-clients"    "Go to Clients tab (list of clients)"
capture "04-schedule"   "Go to Schedule tab (session calendar/list)"
capture "05-profile"    "Go to Profile tab (trainer profile page)"

# ── 5. Resize to App Store dimensions ─────────────────────────────────────────
echo ""
echo "▶ Resizing screenshots to App Store dimensions..."

resize() {
  local src="$1"
  local dst="$2"
  local w="$3"
  local h="$4"
  if command -v convert &>/dev/null; then
    convert "$src" -resize "${w}x${h}!" "$dst"
  else
    cp "$src" "$dst"
    sips --resampleHeightWidth "$h" "$w" "$dst" &>/dev/null
  fi
}

for f in "$RAW"/*.png; do
  base=$(basename "$f" .png)
  resize "$f" "$FINAL_69/${base}.png" 1320 2868
  resize "$f" "$FINAL_65/${base}.png" 1242 2688
  echo "  ✓  $base → 1320×2868 and 1242×2688"
done

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅  Screenshots ready for App Store Connect"
echo "═══════════════════════════════════════════════"
echo ""
echo "6.9\" (1320×2868) — upload first:"
ls -1 "$FINAL_69/"
echo ""
echo "6.5\" (1242×2688) — upload second:"
ls -1 "$FINAL_65/"
echo ""
echo "Upload via:"
echo "  App Store Connect → MyTrainerHub → 1.0 Prepare for Submission"
echo "  → Previews and Screenshots → drag & drop files"

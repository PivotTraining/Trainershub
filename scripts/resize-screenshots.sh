#!/bin/bash
# Resize raw simulator screenshots to exact App Store Connect dimensions.
#
# App Store required sizes (2025):
#   6.9" Super Retina XDR (iPhone 17 Pro Max):  1320×2868 px  [primary required]
#   6.7" Super Retina XDR (iPhone 15/16 Pro Max): 1290×2796 px
#   6.5" Super Retina XDR (iPhone 11 Pro Max):  1242×2688 px
#
# iPhone 17 Pro Max simulator captures at 1320×2868 natively.
# We scale down for the 6.5" slot.

set -euo pipefail

RAW_DIR="screenshots/raw"
FINAL_DIR="screenshots/final"
mkdir -p "$FINAL_DIR/6.9inch" "$FINAL_DIR/6.5inch"

# Check for sips (macOS built-in) or ImageMagick
if command -v convert &>/dev/null; then
  RESIZE_TOOL="imagemagick"
elif command -v sips &>/dev/null; then
  RESIZE_TOOL="sips"
else
  echo "❌ Neither ImageMagick nor sips found. Install with: brew install imagemagick"
  exit 1
fi

echo "Using: $RESIZE_TOOL"

resize_image() {
  local src="$1"
  local dst="$2"
  local w="$3"
  local h="$4"

  if [[ "$RESIZE_TOOL" == "imagemagick" ]]; then
    convert "$src" -resize "${w}x${h}!" "$dst"
  else
    cp "$src" "$dst"
    sips --resampleHeightWidth "$h" "$w" "$dst" &>/dev/null
  fi
}

for raw_file in "$RAW_DIR"/*-67inch.png; do
  [[ -f "$raw_file" ]] || continue
  base=$(basename "$raw_file" -67inch.png)

  # 6.9" — native iPhone 17 Pro Max resolution
  dst_69="$FINAL_DIR/6.9inch/${base}.png"
  resize_image "$raw_file" "$dst_69" 1320 2868
  echo "  ✓ 6.9\" $dst_69"

  # 6.5" — scale down for iPhone 11 Pro Max slot
  dst_65="$FINAL_DIR/6.5inch/${base}.png"
  resize_image "$raw_file" "$dst_65" 1242 2688
  echo "  ✓ 6.5\" $dst_65"
done

echo ""
echo "✅ Resize complete."
echo ""
echo "6.9\" files (upload first in App Store Connect):"
ls "$FINAL_DIR/6.9inch/"
echo ""
echo "6.5\" files:"
ls "$FINAL_DIR/6.5inch/"

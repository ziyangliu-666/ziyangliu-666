#!/bin/bash
# Rebuild assets/intro.webp from intro.html.
# Needs Google Chrome, Node 22+ (for the built-in WebSocket) and img2webp (brew install webp).
# Quality 55 at 12 fps keeps the file under 2 MB, so the profile page loads fast.
# Dark scenes use flat colours, not gradients: a dark gradient breaks into visible
# blocks at this quality.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
frames=$(mktemp -d)
node "$here/capture.mjs" "$frames" 12
img2webp -loop 0 -lossy -exact -q 55 -m 6 -d 83 "$frames"/f*.png -o "$here/../assets/intro.webp"
rm -rf "$frames"
ls -l "$here/../assets/intro.webp"

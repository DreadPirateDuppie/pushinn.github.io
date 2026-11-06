#!/bin/bash
# Admin Reports list checks. Starts a local server, headless Chrome, runs drive.mjs, cleans up.
cd "$(dirname "$0")"
python3 serve.py & SRV=$!
PROFILE=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9361 --user-data-dir="$PROFILE" --no-first-run about:blank >/dev/null 2>&1 & CH=$!
node drive.mjs; RC=$?
kill $SRV $CH 2>/dev/null; rm -rf "$PROFILE"
exit $RC

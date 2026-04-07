#!/bin/sh
set -e

# Start crawler in background (one-off/indexer)
node dist/crawler/index.js &
PID_CRAWLER=$!

term() {
  kill -TERM "$PID_CRAWLER" 2>/dev/null || true
  wait "$PID_CRAWLER" 2>/dev/null || true
  exit 0
}

trap term INT TERM

# Run the API in the foreground so the container keeps running while the API is up.
exec node dist/api/server.js

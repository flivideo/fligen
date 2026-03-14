#!/bin/bash
# Project: FliGen
# Description: Foundational harness for 12 Days of Claudemas
cd "$(dirname "$0")"

echo "================================================"
echo "FliGen - Development Server"
echo "================================================"
echo ""

# Check if already running
if lsof -i :5401 | grep -q LISTEN; then
  echo "FliGen is already running on ports 5400/5401"
  echo "Opening browser..."
  open http://localhost:5400
  exit 0
fi

echo "Building shared types..."
npm run build -w shared

echo ""
echo "Starting FliGen (client: 5400, server: 5401) via Overmind..."
echo "  overmind connect client  — attach to client logs"
echo "  overmind connect server  — attach to server logs"
echo "  overmind stop            — stop all processes"
echo ""

# Open browser after delay (background — gives server time to start)
(sleep 4 && open http://localhost:5400) &

overmind start

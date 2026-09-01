#!/usr/bin/env bash
# FliGen app control — start the app DETACHED so it outlives the shell that launched it
# (an agent session, a terminal you close).
#
# Why overmind and not `npm run dev &`: overmind runs the processes under a tmux server that
# reparents to launchd, so nothing in the launching session's process group can take the app
# down with it. This is the shared app-lifecycle contract — same verbs in every AppyDave app.
#
# ⚠️ This is the AGENT-facing entry point. `scripts/start.sh` (where it exists) is the HUMAN one:
# it is interactive, it asks before reusing a busy port, and it runs in the foreground. Both are
# correct for their caller — do not merge them.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP="FliGen"
SERVER_PORT="${FLIGEN_SERVER_PORT:-5401}"
CLIENT_PORT="${FLIGEN_CLIENT_PORT:-5400}"
URL="http://localhost:${CLIENT_PORT}"
SOCK="./.overmind.sock"
LOGDIR=".logs"
READY_TIMEOUT=90

# Health paths differ across these apps (/api/health vs /health) — probe both rather than
# assuming. A port that merely ACCEPTS a connection is not proof the app is serving.
HEALTH_PATHS=("/api/health" "/health" "/api/system/health")

healthy() {
  local p
  for p in "${HEALTH_PATHS[@]}"; do
    curl -fsS --max-time 3 "http://127.0.0.1:${SERVER_PORT}${p}" >/dev/null 2>&1 && return 0
  done
  return 1
}

client_up() { curl -fsS --max-time 3 -o /dev/null "$URL" 2>/dev/null; }
daemon_up() { [ -S "$SOCK" ] && overmind ps >/dev/null 2>&1; }

clear_stale_socket() {
  if [ -e "$SOCK" ] && ! daemon_up; then
    echo "  (clearing stale $SOCK from a previous run)"
    rm -f "$SOCK"
  fi
}

port_owner() { lsof -i ":$1" -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1" (pid "$2")"}'; }

cmd_start() {
  if healthy; then
    echo "Already running and healthy — nothing to do."
    cmd_status
    return 0
  fi

  # A busy port owned by something ELSE is a stop-and-report, never a silent kill. start.sh's
  # non-TTY branch kills the occupant; an agent must not.
  local owner
  for prt in "$SERVER_PORT" "$CLIENT_PORT"; do
    owner=$(port_owner "$prt")
    if [ -n "$owner" ] && ! daemon_up; then
      echo "Port $prt is already held by: $owner"
      echo "Not starting — that is not this app's overmind. Stop it yourself, or use 'restart'."
      return 1
    fi
  done

  clear_stale_socket
  mkdir -p "$LOGDIR"

  if daemon_up; then
    echo "Overmind is up but the app is not answering yet; waiting."
  else
    echo "Starting ${APP} (detached)…"
    local banner
    # -N: don't let overmind inject $PORT. The Procfile pins the ports itself.
    if ! banner=$(overmind start -D -N 2>&1); then
      echo "overmind failed to start:"
      echo "$banner" | sed 's/^/  /'
      return 1
    fi
  fi

  printf "Waiting for %s" "$APP"
  for _ in $(seq 1 "$READY_TIMEOUT"); do
    if healthy; then
      echo " — up."
      cmd_status
      return 0
    fi
    if ! daemon_up; then
      echo
      echo "The processes died during startup. Logs:"
      cmd_logs_tail
      return 1
    fi
    printf "."
    sleep 1
  done

  echo
  echo "Started, but did NOT become healthy within ${READY_TIMEOUT}s."
  echo "The processes are still running — a slow or broken boot, not a clean failure. Logs:"
  cmd_logs_tail
  return 1
}

cmd_stop() {
  if ! daemon_up; then
    clear_stale_socket
    if healthy; then
      echo "${APP} is answering on ${SERVER_PORT} but is NOT under overmind."
      echo "It was started by hand (npm run dev / scripts/start.sh). Stop it in the terminal that owns it —"
      echo "  holder: $(port_owner "$SERVER_PORT")"
      echo "Refusing to kill a process this script did not start."
      return 1
    fi
    echo "Not running."
    return 0
  fi
  echo "Stopping…"
  overmind quit >/dev/null 2>&1
  for _ in $(seq 1 15); do
    daemon_up || { echo "Stopped."; clear_stale_socket; return 0; }
    sleep 1
  done
  echo "Did not stop gracefully; killing."
  overmind kill >/dev/null 2>&1
  clear_stale_socket
}

cmd_status() {
  if healthy; then
    echo "health: UP   server :${SERVER_PORT}"
  else
    echo "health: DOWN (server :${SERVER_PORT} not answering on ${HEALTH_PATHS[*]})"
  fi
  if client_up; then
    echo "client: UP   ${URL}"
  else
    echo "client: DOWN (${URL})"
  fi
  if daemon_up; then
    echo "processes:"
    overmind ps
  else
    echo "processes: overmind is not running (app may be running outside it)"
  fi
}

# "Show me it" for a web app = put the URL in front of David. Starts it first if needed.
cmd_open() {
  healthy || { echo "Not running — starting first."; cmd_start || return 1; }
  echo "Opening ${URL}"
  open "$URL"
}

# A SNAPSHOT that returns. Never `overmind echo` — it follows the stream forever and macOS has
# no `timeout` to bound it.
cmd_logs_tail() {
  local logs; logs=$(ls "$LOGDIR"/*.log 2>/dev/null)
  if [ -z "$logs" ]; then echo "  (no logs in $LOGDIR yet)"; return 0; fi
  # shellcheck disable=SC2086
  tail -n 25 $logs
}

case "${1:-start}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status)  cmd_status ;;
  open)    cmd_open ;;
  logs)    ls "$LOGDIR"/*.log >/dev/null 2>&1 && tail -f "$LOGDIR"/*.log || echo "No logs in $LOGDIR — has it been started?" ;;
  tail)    cmd_logs_tail ;;
  *) echo "usage: scripts/app.sh {start|stop|restart|status|open|logs|tail}"; exit 2 ;;
esac

#!/usr/bin/env bash
#
# Dung frontend va moi instance backend cua Multi-User System.
#
# Dung theo 2 lop: (1) cac nhom tien trinh da ghi trong .runtime/pids/
# (do run-all.sh tao), (2) bat ky tien trinh nao con lang nghe o cong
# frontend (3000) hoac backend (8081-8089), ke ca tien trinh chay tay.
# Gui SIGTERM truoc, het thoi gian cho moi gui SIGKILL. Khong dung nginx.
#
# Su dung:
#   ./scripts/stop-all.sh

set -uo pipefail

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

stop_pid_files() {
  local pid_file pgid
  for pid_file in "$PID_DIR"/*.pid; do
    [ -e "$pid_file" ] || continue
    pgid=$(cat "$pid_file")
    if kill -0 -- "-$pgid" 2>/dev/null; then
      echo "Dung $(basename "$pid_file" .pid) (nhom tien trinh $pgid)"
      kill -TERM -- "-$pgid" 2>/dev/null
    fi
    rm -f "$pid_file"
  done
}

stop_port_listeners() {
  local port pid
  for port in $(managed_ports); do
    for pid in $(pids_on_port "$port"); do
      echo "Dung tien trinh $pid dang chiem cong $port"
      kill -TERM "$pid" 2>/dev/null
    done
  done
}

busy_managed_ports() {
  local port
  for port in $(managed_ports); do
    is_port_busy "$port" && echo "$port"
  done
}

step "Dung frontend + backend"
stop_pid_files
stop_port_listeners

for _ in $(seq 1 "$STOP_TIMEOUT_SECONDS"); do
  [ -z "$(busy_managed_ports)" ] && break
  sleep 1
done

remaining=$(busy_managed_ports)
if [ -n "$remaining" ]; then
  warn "Sau ${STOP_TIMEOUT_SECONDS}s van con cong: $(echo $remaining) - gui SIGKILL."
  for port in $remaining; do
    for pid in $(pids_on_port "$port"); do
      kill -KILL "$pid" 2>/dev/null
    done
  done
  sleep 1
fi

remaining=$(busy_managed_ports)
if [ -n "$remaining" ]; then
  fail "Khong giai phong duoc cong: $(echo $remaining) (co the do user khac chay - thu voi sudo)."
fi
echo "Da dung tat ca. Cac cong $FRONTEND_PORT, $(backend_port 1)-$(backend_port "$MAX_BACKEND_INSTANCES") deu trong."

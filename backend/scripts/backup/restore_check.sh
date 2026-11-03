#!/usr/bin/env bash
# 백업이 실제로 복원되는지 확인한다. 임시 PostgreSQL 을 띄워 덤프를 넣고 행 수를 센 뒤 모두 지운다.
# 운영 DB 에는 접속하지 않는다. 사용: restore_check.sh [덤프 파일]  (없으면 가장 최근 일별 백업)
set -euo pipefail

BACKUP_DIR="${KBEE_BACKUP_DIR:-$HOME/kbee_backups}"
PG_BIN="${KBEE_PG_BIN:-/usr/local/opt/postgresql@17/bin}"
PORT="${KBEE_CHECK_PORT:-55433}"

dump="${1:-$(ls -1t "$BACKUP_DIR"/daily/kbee_*.dump 2>/dev/null | head -1)}"
if [ -z "$dump" ] || [ ! -r "$dump" ]; then
  echo "실패: 확인할 덤프가 없습니다"
  exit 1
fi

work="$(mktemp -d /tmp/kbee_restore.XXXXXX)"
cleanup() {
  "$PG_BIN/pg_ctl" -D "$work/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$work/data" -U kbee -A trust -E UTF8 --locale=C >/dev/null
"$PG_BIN/pg_ctl" -D "$work/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$work/pg.log" -w start >/dev/null
PSQL=("$PG_BIN/psql" -h 127.0.0.1 -p "$PORT" -U kbee -v ON_ERROR_STOP=1 -tA)
"${PSQL[@]}" -d postgres -c "create database restore_check" >/dev/null
"$PG_BIN/pg_restore" -h 127.0.0.1 -p "$PORT" -U kbee --no-owner --no-privileges --exit-on-error -d restore_check "$dump"

echo "복원 확인: $(basename "$dump")"
for table in users apiaries colonies queens colony_queens matings samples test_groups field_visits field_records field_events trait_observations record_revisions; do
  printf '  %-20s %s\n' "$table" "$("${PSQL[@]}" -d restore_check -c "select count(*) from $table")"
done
echo "성공: 덤프가 새 데이터베이스에 그대로 복원됐습니다"

#!/usr/bin/env bash
# K-BEE BANK 운영 DB 백업. launchd 가 매일 실행한다(설치는 README.md).
# 일별 30개, 월별 12개를 남긴다. 덤프가 열리는지 확인한 뒤에만 보관한다.
set -euo pipefail

URL_FILE="${KBEE_DB_URL_FILE:-$HOME/.kbee/database_url}"
BACKUP_DIR="${KBEE_BACKUP_DIR:-$HOME/kbee_backups}"
PG_BIN="${KBEE_PG_BIN:-/usr/local/opt/postgresql@17/bin}"
KEEP_DAILY="${KBEE_KEEP_DAILY:-30}"
KEEP_MONTHLY="${KBEE_KEEP_MONTHLY:-12}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$BACKUP_DIR/backup.log"; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/monthly"
chmod 700 "$BACKUP_DIR"

if [ ! -r "$URL_FILE" ]; then
  log "실패: 연결 주소 파일이 없습니다($URL_FILE)"
  exit 1
fi
if [ "$(stat -f %Lp "$URL_FILE")" != "600" ]; then
  log "실패: $URL_FILE 권한이 600 이 아닙니다"
  exit 1
fi
# Neon 의 -pooler 주소는 pg_dump 에 맞지 않아 직접 연결 주소로 바꾼다
DB_URL="$(sed 's/-pooler\./\./' "$URL_FILE")"

stamp="$(date +%Y%m%d_%H%M)"
out="$BACKUP_DIR/daily/kbee_$stamp.dump"
tmp="$out.part"
trap 'rm -f "$tmp"' EXIT

"$PG_BIN/pg_dump" --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$tmp"

# 덤프 목록을 읽을 수 있고 핵심 테이블이 들어 있어야 보관한다
for table in users apiaries colonies queens colony_queens field_visits field_records trait_observations; do
  if ! "$PG_BIN/pg_restore" --list "$tmp" | grep -q "TABLE DATA public $table "; then
    log "실패: 덤프에 $table 이 없습니다"
    exit 1
  fi
done
mv "$tmp" "$out"
chmod 600 "$out"

month_file="$BACKUP_DIR/monthly/kbee_$(date +%Y%m).dump"
[ -e "$month_file" ] || cp -p "$out" "$month_file"

# 오래된 백업 정리
find "$BACKUP_DIR/daily" -name 'kbee_*.dump' -mtime +"$KEEP_DAILY" -delete
ls -1t "$BACKUP_DIR"/monthly/kbee_*.dump 2>/dev/null | tail -n +"$((KEEP_MONTHLY + 1))" | while read -r f; do rm -f "$f"; done

# 두 번째 보관 위치(연구실 서버·외장 디스크 등)를 지정하면 복사한다
if [ -n "${KBEE_BACKUP_COPY:-}" ]; then
  rsync -a "$BACKUP_DIR/daily/" "$KBEE_BACKUP_COPY/daily/" && rsync -a "$BACKUP_DIR/monthly/" "$KBEE_BACKUP_COPY/monthly/"
fi

log "완료: $(basename "$out") $(du -h "$out" | cut -f1)"

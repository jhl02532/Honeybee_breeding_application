#!/usr/bin/env bash
# 이 맥에 매일 백업을 건다: 스크립트를 ~/.kbee 로 복사하고 launchd 작업(매일 03:30)을 등록한다.
# 연결 주소 파일(~/.kbee/database_url, 권한 600)은 먼저 만들어 둔다. README.md 참고.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.kbee"
LABEL="kr.ac.inu.kbee.backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
BACKUP_DIR="${KBEE_BACKUP_DIR:-$HOME/kbee_backups}"
PG_BIN="${KBEE_PG_BIN:-/usr/local/opt/postgresql@17/bin}"

mkdir -p "$DEST" "$BACKUP_DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$DEST" "$BACKUP_DIR"
install -m 700 "$HERE/backup_db.sh" "$HERE/restore_check.sh" "$DEST/"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$DEST/backup_db.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>KBEE_BACKUP_DIR</key><string>$BACKUP_DIR</string>
    <key>KBEE_PG_BIN</key><string>$PG_BIN</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$BACKUP_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$BACKUP_DIR/launchd.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "등록됨: 매일 03:30 백업 → $BACKUP_DIR (맥이 잠들어 있었으면 깨어난 뒤 실행)"

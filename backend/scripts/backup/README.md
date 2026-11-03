# 운영 DB 백업

운영 DB(Neon PostgreSQL 17)를 연구실 맥에 매일 덤프한다. 일별 30개, 월별 12개를 남기고, 한 달에 한 번 복원 시험을 한다.
덤프에는 계정 비밀번호 해시와 농가 정보가 들어 있다. iCloud·Dropbox 같은 동기화 폴더에 두지 않는다.

## 설치 (한 번)

1. PostgreSQL 17 도구 설치

   ```bash
   brew install postgresql@17
   ```

2. 운영 DB 연결 주소 저장. Neon 비밀번호를 바꾼 뒤의 새 주소를 쓴다. 화면에 보이지 않게 입력한다.

   ```bash
   mkdir -p ~/.kbee && chmod 700 ~/.kbee
   read -s -p "운영 DB 주소: " U && printf '%s' "$U" > ~/.kbee/database_url && chmod 600 ~/.kbee/database_url && unset U
   ```

3. 매일 백업 등록과 첫 백업

   ```bash
   bash backend/scripts/backup/install_backup.sh
   ~/.kbee/backup_db.sh
   ~/.kbee/restore_check.sh
   ```

## 확인과 복원

- 기록: `~/kbee_backups/backup.log`
- 월 1회 복원 시험: `~/.kbee/restore_check.sh` (임시 DB에 복원해 행 수를 센 뒤 지운다. 운영 DB에는 접속하지 않는다)
- 실제 복원은 새 Neon 브랜치나 새 DB에 한다. 운영 DB에 바로 덮어쓰지 않는다.

  ```bash
  pg_restore --no-owner --no-privileges -d "<새 DB 주소>" ~/kbee_backups/daily/kbee_YYYYMMDD_HHMM.dump
  ```

- 두 번째 보관 위치를 쓰려면 `KBEE_BACKUP_COPY=/Volumes/외장디스크/kbee` 처럼 지정한다(launchd 작업의 EnvironmentVariables 에 추가).

사람이 읽을 수 있는 사본은 웹의 현장 기록 → 전체 내보내기(zip)로 받는다. 백업 덤프는 복원용, 내보내기 zip 은 분석·이관용이다.

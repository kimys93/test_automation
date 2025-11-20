#!/bin/sh
# Playwright 테스트 실행 및 results.json 파일 생성 대기 스크립트
# n8n에서 사용하기 위한 스크립트
# 테스트 결과 로그를 감지하면 프로세스를 종료합니다

WORKSPACE_DIR="${1:-/workspace}"
RESULTS_JSON="${WORKSPACE_DIR}/test-results/results.json"
MAX_WAIT=120  # 최대 120초 대기
TEST_PID=""
TEST_COMPLETED=0

# 작업 디렉토리로 이동
cd "${WORKSPACE_DIR}" || exit 1

# 테스트 실행 (백그라운드로 실행하고 출력을 파일로 저장)
npm run test:sanity > /tmp/test_output.log 2>&1 &
TEST_PID=$!

# 테스트 출력을 실시간으로 모니터링하면서 결과 패턴 감지
tail -f /tmp/test_output.log 2>/dev/null | while IFS= read -r line; do
  # 로그 출력 (stderr로 출력하여 stdout은 JSON만 출력)
  echo "$line" >&2
  
  # 테스트 완료 패턴 감지:
  # - "n passed" 또는 "n failed" (예: "1 passed", "2 failed", "1 failed")
  # - "passed" 또는 "failed" 단독
  # - "skipped" 패턴
  # - "1 failed" 같은 패턴도 감지
  if echo "$line" | grep -qE "([0-9]+\s+(passed|failed|skipped)|^\s*[0-9]+\s+(passed|failed|skipped)|passed|failed|skipped)"; then
    # 테스트 완료 신호 감지 - 플래그 파일 생성
    touch /tmp/test_completed.flag
    # npm 프로세스 종료
    kill -TERM $TEST_PID 2>/dev/null || true
    pkill -TERM -f "npm run test:sanity" 2>/dev/null || true
    pkill -TERM -f "playwright" 2>/dev/null || true
    break
  fi
done &
MONITOR_PID=$!

# 테스트 프로세스가 종료될 때까지 대기 (최대 MAX_WAIT 초)
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  # 테스트 완료 플래그 확인
  if [ -f /tmp/test_completed.flag ]; then
    # 테스트 완료 플래그 발견 - 프로세스 종료
    pkill -TERM -f "npm run test:sanity" 2>/dev/null || true
    pkill -TERM -f "playwright" 2>/dev/null || true
    sleep 2
    break
  fi
  
  # 테스트 프로세스가 종료되었는지 확인
  if [ -n "$TEST_PID" ] && ! kill -0 $TEST_PID 2>/dev/null; then
    # 프로세스가 종료됨
    break
  fi
  
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

# 모니터 프로세스 종료
kill $MONITOR_PID 2>/dev/null || true
rm -f /tmp/test_completed.flag 2>/dev/null || true

# results.json 파일이 생성될 때까지 추가 대기 (최대 10초)
WAIT_COUNT=0
while [ $WAIT_COUNT -lt 10 ]; do
  if [ -f "${RESULTS_JSON}" ]; then
    # 파일이 생성되었으면 안정화를 위해 잠시 대기
    sleep 1
    break
  fi
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

# results.json 파일이 없으면 빈 JSON 반환
if [ ! -f "${RESULTS_JSON}" ]; then
  echo "{}"
  
  # Playwright 관련 프로세스 강제 종료 (혹시 남아있을 수 있음)
  pkill -9 -f "playwright" 2>/dev/null || true
  pkill -9 -f "chromium" 2>/dev/null || true
  pkill -9 -f "chrome" 2>/dev/null || true
  pkill -9 -f "node.*test" 2>/dev/null || true
  exit 0
fi

# =======================================================
# Allure 명령 추가 (results.json 생성 확인 후 실행)
# =======================================================

# 1. Allure 리포트 생성 (allure-results를 읽어 allure-report 폴더 생성)
# stderr로 로그 출력
echo "--- Allure Report Generation Started ---" >&2
allure generate allure-results -o allure-report > /tmp/allure_generate.log 2>&1

# 2. Allure DB 저장 스크립트 실행 (allure-report의 데이터를 DB에 저장)
# stderr로 로그 출력
echo "--- Allure DB Save Started ---" >&2
npm run allure:save-db > /tmp/allure_save_db.log 2>&1

echo "--- Allure Operations Completed ---" >&2

# =======================================================

# results.json 파일 내용만 출력 (JSON만 출력)
cat "${RESULTS_JSON}"

# Playwright 관련 프로세스 강제 종료 (혹시 남아있을 수 있음)
pkill -9 -f "playwright" 2>/dev/null || true
pkill -9 -f "chromium" 2>/dev/null || true
pkill -9 -f "chrome" 2>/dev/null || true
pkill -9 -f "node.*test" 2>/dev/null || true

exit 0
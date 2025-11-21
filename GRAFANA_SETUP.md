# Grafana 대시보드 설정 가이드

## 개요

테스트 자동화 결과를 시각화하기 위해 Grafana를 Docker Compose에 추가하고, PostgreSQL 데이터베이스와 연동하여 대시보드를 구성했습니다.

## 1. Docker Compose 설정

### Grafana 서비스 추가

`docker-compose.yml`에 Grafana 서비스를 추가했습니다:

```yaml
grafana:
  image: grafana/grafana:latest
  container_name: test-automation-grafana
  ports:
    - "3001:3000"  # 호스트 포트 3001로 접근
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
    - GF_INSTALL_PLUGINS=
  volumes:
    - grafana_data:/var/lib/grafana
    - ./grafana/provisioning:/etc/grafana/provisioning
    - ./grafana/dashboards:/var/lib/grafana/dashboards
  depends_on:
    - server
  restart: unless-stopped
```

### 주요 설정
- **포트**: 3001 (호스트) → 3000 (컨테이너)
- **기본 계정**: admin / admin (환경 변수로 변경 가능)
- **데이터 영속성**: `grafana_data` 볼륨 사용
- **프로비저닝**: `./grafana/provisioning` 디렉토리 마운트

## 2. Grafana 프로비저닝 설정

### 2.1 데이터소스 설정

`grafana/provisioning/datasources/postgresql.yml`:

```yaml
apiVersion: 1

datasources:
  - name: PostgreSQL
    type: postgres
    access: proxy
    url: server:5432
    database: test_automation
    user: postgres
    secureJsonData:
      password: postgres
    jsonData:
      sslmode: disable
      postgresVersion: 1500
      timescaledb: false
```

### 2.2 대시보드 프로비저닝

`grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'Test Automation'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

## 3. 대시보드 구성

### 3.1 패널 구성

대시보드는 다음 6개의 패널로 구성되어 있습니다:

#### 1. Test Runs Over Time (시계열 차트)
- **위치**: 상단 왼쪽 (12x8)
- **데이터**: `test_runs` 테이블
- **메트릭**: Total Tests, Passed, Failed, Skipped
- **타입**: Time Series

#### 2. Test Status Distribution (Bar Gauge)
- **위치**: 상단 오른쪽 (12x8)
- **데이터**: `test_runs` 테이블의 합계
- **메트릭**: Passed, Failed, Skipped (색상: 초록, 빨강, 노랑)
- **타입**: Bar Gauge (Vertical)

#### 3. Recent Test Runs (테이블)
- **위치**: 중앙 전체 (24x8)
- **데이터**: 최근 20개 테스트 실행 결과
- **컬럼**: run_id, test_type, status, total_tests, passed_tests, failed_tests, skipped_tests, started_at, duration_ms
- **타입**: Table

#### 4. Test Failure Rate (Bar Chart)
- **위치**: 하단 왼쪽 (12x8)
- **데이터**: `test_statistics` 테이블
- **메트릭**: 테스트별 실패율 (failure_rate)
- **타입**: Bar Chart (Horizontal)
- **색상**: failure_rate 값에 따라 자동 색상 지정

#### 5. Daily Test Statistics (시계열 차트)
- **위치**: 하단 오른쪽 (12x8)
- **데이터**: 일별 테스트 통계
- **메트릭**: Total Tests, Passed, Failed, Skipped
- **타입**: Time Series

#### 6. Failed Test Error Logs (테이블)
- **위치**: 최하단 전체 (24x12)
- **데이터**: 실패한 테스트의 에러 정보
- **컬럼**: 
  - `test_name`: 테스트 이름
  - `error_steps`: 에러가 발생한 3depth 단계들 ( > 로 구분)
  - `status`: 테스트 상태
  - `error_message`: 에러 메시지
  - `run_id`: 실행 ID
- **타입**: Table

### 3.2 주요 SQL 쿼리

#### Test Failure Rate
```sql
SELECT
  test_name,
  failure_rate
FROM test_statistics
WHERE total_runs > 0 AND test_name != 'Unknown Test'
ORDER BY failure_rate DESC
LIMIT 10
```

#### Failed Test Error Logs
```sql
SELECT
  tc.test_name,
  CASE 
    WHEN tc.steps IS NOT NULL AND tc.steps::text != 'null' THEN
      (SELECT string_agg(d3_step->>'title', ' > ')
       FROM jsonb_array_elements(tc.steps::jsonb) AS d2_step,
            jsonb_array_elements(d2_step->'steps') AS d3_step
       WHERE d2_step->'steps' IS NOT NULL
         AND (d3_step->'error' IS NOT NULL OR d3_step->'statusDetails' IS NOT NULL)
       LIMIT 10)
    ELSE NULL
  END AS error_steps,
  tc.status,
  tc.error_message,
  tr.run_id
FROM test_cases tc
JOIN test_runs tr ON tc.test_run_id = tr.id
WHERE tc.status = 'FAILED'
ORDER BY tr.started_at DESC, tc.test_name
LIMIT 50
```

## 4. 환경 변수 설정

### 4.1 Jenkins 환경 변수

Jenkins 관리 → 시스템 설정 → Global properties → Environment variables에서 다음 변수를 설정해야 합니다:

- **JENKINS_URL**: `http://YOUR_IP:8080` (Jenkins 서버 주소)
- **GRAFANA_URL**: `http://YOUR_IP:3001` (Grafana 서버 주소)

### 4.2 .env.example

`.env.example` 파일에 다음 환경 변수 예시가 포함되어 있습니다:

```env
# Base URL for test server
BASE_URL=http://IP주소:3000

# Jenkins URL (for Playwright Report links in Slack)
JENKINS_URL=http://IP주소:8080

# Grafana URL (for Dashboard links in Slack)
GRAFANA_URL=http://IP주소:3001

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=test_automation
DB_USER=postgres
DB_PASSWORD=postgres

# Test Type (sanity, regression, etc.)
TEST_TYPE=sanity
```

## 5. Slack 통합

### 5.1 Jenkinsfile 설정

`Jenkinsfile`과 `Jenkinsfile.windows`에서 Slack 메시지에 Grafana 링크와 Playwright Report 링크를 추가했습니다:

```groovy
def grafanaUrl = env.GRAFANA_URL
def jenkinsUrl = env.JENKINS_URL
def jobName = env.JOB_NAME ?: 'test_automation'
def buildNumber = env.BUILD_NUMBER ?: '1'
def playwrightReportUrl = "${jenkinsUrl}/job/${jobName}/${buildNumber}/Playwright_20Report/"

def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests}
📊 <${grafanaUrl}|Grafana Dashboard> | 📋 <${playwrightReportUrl}|Playwright Report>
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}${failureListMessage}"""
```

## 6. 대시보드 접근

### 6.1 초기 접속

1. Docker Compose로 서비스 시작:
   ```bash
   docker compose up -d
   ```

2. Grafana 접속:
   - URL: `http://localhost:3001` (또는 설정한 IP:3001)
   - 기본 계정: `admin` / `admin`

3. 대시보드 확인:
   - 좌측 메뉴 → Dashboards → Test Automation Dashboard

### 6.2 대시보드 새로고침

대시보드는 30초마다 자동으로 새로고침됩니다 (`"refresh": "30s"`).

## 7. 주요 기능

### 7.1 실시간 모니터링
- 테스트 실행 결과를 실시간으로 시각화
- 시간별, 일별 테스트 통계 추적

### 7.2 에러 분석
- 실패한 테스트의 상세 에러 정보 확인
- 에러가 발생한 3depth 단계까지 표시
- 에러 메시지와 스택 트레이스 확인

### 7.3 트렌드 분석
- 테스트 실패율 추이 확인
- 일별 테스트 통계 비교

## 8. 트러블슈팅

### 8.1 Grafana 접속 불가
- Docker 컨테이너 상태 확인: `docker ps`
- 포트 충돌 확인: `lsof -i :3001`
- 로그 확인: `docker logs test-automation-grafana`

### 8.2 데이터가 표시되지 않음
- PostgreSQL 연결 확인
- 데이터소스 설정 확인 (Grafana UI → Configuration → Data Sources)
- 대시보드 쿼리 확인 (패널 편집 → Query Inspector)

### 8.3 대시보드가 로드되지 않음
- 대시보드 JSON 파일 문법 확인: `python3 -m json.tool grafana/dashboards/test-automation-dashboard.json`
- Grafana 로그 확인: `docker logs test-automation-grafana`

## 9. 파일 구조

```
grafana/
├── dashboards/
│   └── test-automation-dashboard.json  # 대시보드 정의
└── provisioning/
    ├── dashboards/
    │   └── dashboard.yml                # 대시보드 프로비저닝 설정
    └── datasources/
        └── postgresql.yml               # PostgreSQL 데이터소스 설정
```

## 10. 참고 사항

- Grafana 대시보드는 `grafana/dashboards/test-automation-dashboard.json` 파일로 관리됩니다.
- 대시보드 수정 시 Grafana를 재시작하면 자동으로 반영됩니다: `docker compose restart grafana`
- 대시보드 설정은 Git에 커밋되어 버전 관리됩니다.
- 프로비저닝 설정을 통해 데이터소스와 대시보드가 자동으로 생성됩니다.


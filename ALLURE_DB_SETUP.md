# Allure Report + DB 연동 설정 가이드

이 가이드는 Playwright 테스트 결과를 Allure Report로 생성하고, PostgreSQL DB에 저장하여 테스트 히스토리를 지속적으로 관리하는 방법을 설명합니다.

## 목차

1. [필수 패키지 설치](#1-필수-패키지-설치)
2. [PostgreSQL 설정](#2-postgresql-설정)
3. [DB 스키마 생성](#3-db-스키마-생성)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [테스트 실행 및 DB 저장](#5-테스트-실행-및-db-저장)
6. [Jenkins 연동](#6-jenkins-연동)
7. [히스토리 조회](#7-히스토리-조회)

---

## 1. 필수 패키지 설치

### Node.js 패키지 설치

```bash
npm install
```

설치되는 패키지:
- `allure-playwright`: Allure Report 리포터
- `pg`: PostgreSQL 클라이언트

### Allure Commandline 설치

**Windows:**
```powershell
# Chocolatey 사용
choco install allure

# 또는 Scoop 사용
scoop install allure
```

**Linux/Mac:**
```bash
# Homebrew (Mac)
brew install allure

# 또는 직접 다운로드
# https://github.com/allure-framework/allure2/releases
```

---

## 2. PostgreSQL 설정

### Docker Compose로 PostgreSQL 실행 (권장)

```bash
# PostgreSQL 시작
docker-compose up -d postgres

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f postgres
```

### 또는 기존 PostgreSQL 사용

PostgreSQL이 이미 설치되어 있다면, 새 데이터베이스 생성:

```sql
CREATE DATABASE test_automation;
```

---

## 3. DB 스키마 생성

**자동 생성 (권장):**

`docker-compose.yml`에 스키마 파일이 마운트되어 있어서, PostgreSQL 컨테이너가 처음 시작될 때 자동으로 스키마가 생성됩니다.

```bash
# PostgreSQL 시작 (스키마 자동 생성)
docker-compose up -d postgres
```

**수동 생성 (필요한 경우):**

이미 데이터베이스가 생성된 경우:

```bash
docker-compose exec -T postgres psql -U postgres -d test_automation < database/schema.sql
```

**생성되는 테이블:**
- `test_runs`: 테스트 실행 정보
- `test_cases`: 개별 테스트 케이스 정보
- `test_statistics`: 테스트 통계 (자동 집계)

---

## 4. 환경 변수 설정

### 로컬 개발 환경 (.env 파일)

`.env` 파일에 다음 환경 변수를 추가:

```env
# DB 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_automation
DB_USER=postgres
DB_PASSWORD=postgres

# 테스트 설정
TEST_TYPE=sanity
BUILD_NUMBER=local
GIT_COMMIT=local
```

### Jenkins 환경 설정

**1. Jenkins 서버에서 PostgreSQL 실행 (docker-compose 사용):**

Jenkins 서버에서 프로젝트 디렉토리로 이동하여 PostgreSQL을 시작:

```bash
# Jenkins 서버에서 실행
cd /path/to/test_automation  # 또는 Windows: C:\path\to\test_automation
docker-compose up -d postgres
```

**2. Jenkins Global Environment Variables 설정:**

Jenkins 관리 → 시스템 설정 → Global properties → Environment variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_automation
DB_USER=postgres
DB_PASSWORD=postgres
TEST_TYPE=sanity
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
```

**참고:** 
- Jenkins 서버에서 `docker-compose up -d postgres`를 한 번 실행하면 PostgreSQL이 백그라운드에서 계속 실행됩니다.
- 빌드마다 컨테이너를 시작/종료하지 않아 더 안정적입니다.
- PostgreSQL이 실행 중인지 확인: `docker-compose ps`

---

## 5. 테스트 실행 및 DB 저장

### 테스트 실행 (Allure Results 생성)

```bash
npm run test:sanity
```

이 명령어는 `allure-results/` 폴더에 JSON 결과 파일을 생성합니다.

### Allure 리포트 생성

```bash
npm run allure:generate
```

생성된 리포트 확인:

```bash
npm run allure:open
```

### DB에 저장

```bash
npm run allure:save-db
```

이 명령어는 `allure-results/` 폴더의 모든 결과를 파싱하여 PostgreSQL DB에 저장합니다.

---

## 6. Jenkins 연동

### Jenkinsfile.windows에 DB 저장 단계 추가

```groovy
stage('Save Test Results to DB') {
    when {
        expression { 
            return fileExists('allure-results') && env.DB_HOST
        }
    }
    steps {
        script {
            echo '💾 테스트 결과를 DB에 저장 중...'
            try {
                bat 'npm run allure:save-db'
                echo '✅ DB 저장 완료'
            } catch (Exception e) {
                echo "❌ DB 저장 중 오류 발생: ${e.message}"
                // DB 저장 실패해도 빌드는 계속 진행
            }
        }
    }
}
```

---

## 7. 히스토리 조회

### SQL 쿼리 예시

**최근 10개 실행 결과:**
```sql
SELECT 
    run_id, test_type, status, 
    total_tests, passed_tests, failed_tests,
    started_at, duration_ms
FROM test_runs
ORDER BY started_at DESC
LIMIT 10;
```

**실패율이 높은 테스트:**
```sql
SELECT 
    test_name, suite_name,
    total_runs, failed_runs,
    failure_rate, last_status, last_run_at
FROM test_statistics
WHERE failure_rate > 0
ORDER BY failure_rate DESC, failed_runs DESC
LIMIT 20;
```

**특정 테스트의 히스토리:**
```sql
SELECT 
    tr.started_at, tc.status, tc.duration_ms,
    tc.error_message
FROM test_cases tc
JOIN test_runs tr ON tc.test_run_id = tr.id
WHERE tc.test_full_name = '테스트 이름'
ORDER BY tr.started_at DESC
LIMIT 50;
```

**일별 통계:**
```sql
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
    AVG(duration_ms) as avg_duration
FROM test_runs
GROUP BY DATE(started_at)
ORDER BY date DESC
LIMIT 30;
```

### 웹 대시보드 (선택사항)

Node.js + Express로 간단한 웹 대시보드를 만들 수 있습니다:

```javascript
// 예시: Express 서버로 DB 조회 API 제공
app.get('/api/test-runs', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM test_runs ORDER BY started_at DESC LIMIT 50'
  );
  res.json(result.rows);
});
```

---

## 장점

✅ **지속적인 히스토리 저장**: 모든 테스트 실행 결과가 DB에 저장됨  
✅ **트렌드 분석**: 어떤 기능이 자주 실패하는지 추적 가능  
✅ **통계 집계**: 실패율, 평균 실행 시간 등 자동 계산  
✅ **빠른 조회**: SQL로 원하는 데이터를 빠르게 조회  
✅ **유연한 분석**: 커스텀 쿼리로 다양한 분석 가능  

---

## 문제 해결

### DB 연결 오류

- PostgreSQL이 실행 중인지 확인
- 환경 변수가 올바르게 설정되었는지 확인
- 방화벽 설정 확인

### Allure Results 파일이 없음

- 테스트 실행 후 `allure-results/` 폴더 확인
- `playwright.config.js`에 Allure 리포터가 추가되었는지 확인

### 스키마 오류

- `database/schema.sql` 파일이 올바르게 실행되었는지 확인
- PostgreSQL 버전 호환성 확인 (PostgreSQL 12 이상 권장)


# ReportPortal 설정 및 사용 가이드

이 가이드는 Playwright 테스트 결과를 ReportPortal에 연동하는 전체 과정을 설명합니다.

## 목차

1. [ReportPortal 도커 실행](#1-reportportal-도커-실행)
2. [초기 설정](#2-초기-설정)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [패키지 설치](#4-패키지-설치)
5. [테스트 실행 및 결과 확인](#5-테스트-실행-및-결과-확인)
6. [Jenkins 연동](#6-jenkins-연동)
7. [문제 해결](#7-문제-해결)

---

## 1. ReportPortal 도커 실행

### 도커 Compose로 ReportPortal 시작

```bash
docker-compose -f docker-compose.reportportal.yml up -d
```

이 명령어는 다음 서비스들을 시작합니다:
- **PostgreSQL** (포트 5432): 데이터베이스
- **Elasticsearch** (포트 9200): 검색 엔진
- **MinIO** (포트 9000, 9001): 객체 스토리지
- **ReportPortal API** (내부 포트 8080): 백엔드 API
- **ReportPortal UI** (포트 8082): 웹 UI ⭐ **테스트 결과 확인 포트**

### 서비스 상태 확인

```bash
docker-compose -f docker-compose.reportportal.yml ps
```

### 로그 확인

```bash
docker-compose -f docker-compose.reportportal.yml logs -f
```

### 서비스 중지

```bash
docker-compose -f docker-compose.reportportal.yml down
```

### 데이터 삭제 (주의: 모든 데이터가 삭제됩니다)

```bash
docker-compose -f docker-compose.reportportal.yml down -v
```

---

## 2. 초기 설정

### 웹 UI 접속

1. 브라우저에서 `http://localhost:8082` 접속
2. 초기 로그인 정보:
   - **Username**: `default`
   - **Password**: `1q2w3e` (기본 비밀번호, 첫 로그인 후 변경 권장)

### 프로젝트 생성

1. 로그인 후 상단 메뉴에서 **Administrative** → **Projects** 클릭
2. **Add Project** 버튼 클릭
3. 프로젝트 정보 입력:
   - **Project Name**: `test-automation` (또는 원하는 이름)
   - **Project Type**: Personal 또는 Superadmin
4. **Add** 버튼 클릭

### API Token 생성

1. 우측 상단 프로필 아이콘 클릭 → **Profile** 선택
2. **Generate** 버튼 클릭하여 새로운 API Token 생성
3. 생성된 Token을 복사하여 안전한 곳에 보관
   - ⚠️ **중요**: Token은 프로젝트 이름이 접두사로 포함됩니다 (예: `test-automation_...`)
   - 전체 Token을 그대로 사용해야 합니다

---

## 3. 환경 변수 설정

### 로컬 개발 환경 (.env 파일)

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# ReportPortal 설정
REPORTPORTAL_ENABLED=true
REPORTPORTAL_ENDPOINT=http://localhost:8082/api/v1
REPORTPORTAL_PROJECT=test-automation
REPORTPORTAL_LAUNCH=Playwright Tests
REPORTPORTAL_DESCRIPTION=로컬에서 실행된 Playwright 테스트 결과
REPORTPORTAL_TOKEN=reportportal에서_생성한_API_토큰_전체
TEST_TYPE=sanity
```

**⚠️ 중요 사항:**
- `REPORTPORTAL_ENDPOINT`는 반드시 `/api/v1`로 끝나야 합니다
- `REPORTPORTAL_TOKEN`은 ReportPortal에서 생성한 전체 토큰을 사용합니다 (프로젝트 접두사 포함)
- `.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다

### Jenkins 환경 (Global Environment Variables)

Jenkins에서 ReportPortal을 사용하려면 Jenkins Global Environment에 환경 변수를 설정해야 합니다:

1. **Jenkins 관리** → **시스템 설정** → **Global properties** → **Environment variables** 체크
2. 다음 환경 변수 추가:

```
REPORTPORTAL_ENABLED=true
REPORTPORTAL_ENDPOINT=http://localhost:8082/api/v1
REPORTPORTAL_PROJECT=test-automation
REPORTPORTAL_LAUNCH=Jenkins Build
REPORTPORTAL_DESCRIPTION=Jenkins에서 실행된 Playwright 테스트 결과
REPORTPORTAL_TOKEN=reportportal에서_생성한_API_토큰_전체
TEST_TYPE=sanity
```

**설명:**
- `REPORTPORTAL_ENABLED`: ReportPortal 연동 활성화 여부 (`true` 또는 `false`)
- `REPORTPORTAL_ENDPOINT`: ReportPortal API 서버 주소 (반드시 `/api/v1`로 끝나야 함)
- `REPORTPORTAL_PROJECT`: ReportPortal에서 생성한 프로젝트 이름
- `REPORTPORTAL_LAUNCH`: 테스트 실행 이름 (각 실행마다 구분됨)
- `REPORTPORTAL_DESCRIPTION`: 테스트 실행에 대한 설명
- `REPORTPORTAL_TOKEN`: ReportPortal에서 생성한 API Token (전체)
- `TEST_TYPE`: 실행할 테스트 타입 (`sanity`, `regression` 등)

---

## 4. 패키지 설치

```bash
npm install
```

또는 ReportPortal 패키지만 설치:

```bash
npm install @reportportal/agent-js-playwright
```

---

## 5. 테스트 실행 및 결과 확인

### 테스트 실행

ReportPortal 연동이 활성화된 상태로 테스트를 실행합니다:

```bash
npm test
```

또는

```bash
npm run test:sanity
```

### 결과 확인 방법

#### 방법 1: Launches에서 확인 (권장) ⭐

**Launches**는 각 테스트 실행의 상세 결과를 보는 곳입니다.

1. `http://localhost:8082` 접속
2. 로그인
3. 프로젝트 선택
4. 상단 메뉴에서 **"Launches"** 클릭
5. Launch 목록에서 테스트 실행 선택
6. 상세 결과 확인:
   - 각 테스트 케이스별 결과 (Pass/Fail)
   - 스크린샷 (실패 시)
   - 로그 및 에러 메시지
   - 실행 시간
   - 테스트 단계별 상세 정보

#### 방법 2: Dashboard Widget으로 통계 확인

**Dashboard**는 여러 테스트 실행의 통계와 추이를 보는 곳입니다.

1. `http://localhost:8082` 접속
2. **"Dashboard"** 메뉴 클릭
3. Widget 추가/편집:
   - **"Add Widget"** 클릭
   - 원하는 위젯 타입 선택:
     - **Overall Statistics**: 전체 통계
     - **Launch Statistics**: Launch별 통계
     - **Failed Cases**: 실패한 케이스
     - **Pass Rate**: 통과율
     - **Duration**: 실행 시간
   - Launch 필터 설정 (특정 Launch만 보려면)
   - 저장

### Launch vs Widget 차이

| 항목 | Launch | Widget |
|------|--------|--------|
| 용도 | 개별 테스트 실행 결과 | 통계 및 추이 |
| 위치 | Launches 탭 | Dashboard |
| 내용 | 테스트 케이스별 상세 결과 | 집계된 통계 데이터 |
| 사용 시점 | 각 테스트 실행 후 | 여러 실행의 추이 확인 |

**결론**: 
- **상세 결과**는 **Launches**에서 확인
- **통계 및 추이**는 **Dashboard Widget**에서 확인

---

## 6. Jenkins 연동

### Jenkinsfile 설정

Jenkinsfile은 이미 Jenkins Global Environment의 환경 변수를 사용하도록 설정되어 있습니다:

```groovy
environment {
    REPORTPORTAL_ENABLED = "${env.REPORTPORTAL_ENABLED}"
    REPORTPORTAL_ENDPOINT = "${env.REPORTPORTAL_ENDPOINT}"
    REPORTPORTAL_PROJECT = "${env.REPORTPORTAL_PROJECT}"
    REPORTPORTAL_LAUNCH = "${env.REPORTPORTAL_LAUNCH}"
    REPORTPORTAL_DESCRIPTION = "${env.REPORTPORTAL_DESCRIPTION}"
    REPORTPORTAL_TOKEN = "${env.REPORTPORTAL_TOKEN}"
    TEST_TYPE = "${env.TEST_TYPE}"
}
```

### Jenkins에서 환경 변수 설정

1. Jenkins 관리 → 시스템 설정
2. Global properties → Environment variables 체크
3. 필요한 환경 변수 추가 (위의 [환경 변수 설정](#3-환경-변수-설정) 섹션 참고)

### Jenkins 빌드 후 결과 확인

1. Jenkins 빌드가 완료되면 ReportPortal에 자동으로 결과가 전송됩니다
2. `http://localhost:8082` 접속
3. **Launches** 탭에서 Jenkins 빌드 이름으로 된 Launch 확인
4. Launch 클릭하여 상세 결과 확인

---

## 7. 문제 해결

### 문제: 테스트 결과가 ReportPortal에 나타나지 않음

**확인 사항:**

1. **환경 변수가 제대로 설정되었는지 확인**
   ```bash
   # 로컬에서 실행 시
   echo $REPORTPORTAL_ENABLED
   echo $REPORTPORTAL_ENDPOINT
   echo $REPORTPORTAL_TOKEN
   
   # Jenkins에서 실행 시 (Jenkinsfile에 echo 추가)
   ```

2. **API 엔드포인트 확인**
   - `REPORTPORTAL_ENDPOINT`가 `/api/v1`로 끝나는지 확인
   - ✅ 올바른 예: `http://localhost:8082/api/v1`
   - ❌ 잘못된 예: `http://localhost:8082`

3. **토큰 확인**
   - ReportPortal에서 생성한 토큰이 올바른지 확인
   - 프로젝트 권한이 있는지 확인
   - 전체 토큰을 사용했는지 확인 (프로젝트 접두사 포함)

4. **네트워크 연결 확인**
   - Jenkins 서버에서 ReportPortal 서버로 접근 가능한지 확인
   - `localhost`가 아닌 경우 실제 IP 주소 사용
   - 방화벽 설정 확인

5. **패키지 설치 확인**
   ```bash
   npm list @reportportal/agent-js-playwright
   ```

6. **테스트 실행 로그 확인**
   - ReportPortal 연결 관련 에러 메시지 확인
   - 네트워크 오류 확인

### 문제: Launch는 보이는데 상세 결과가 없음

- Launch가 생성되었지만 테스트가 실행되지 않았을 수 있음
- Launch를 클릭해서 상세 페이지 확인
- 테스트 케이스가 등록되었는지 확인

### 문제: ReportPortal 서비스가 시작되지 않음

```bash
# 서비스 상태 확인
docker-compose -f docker-compose.reportportal.yml ps

# 로그 확인
docker-compose -f docker-compose.reportportal.yml logs api
docker-compose -f docker-compose.reportportal.yml logs uat
```

### 문제: 포트 충돌

`docker-compose.reportportal.yml` 파일에서 포트를 변경할 수 있습니다:

```yaml
ports:
  - "8082:8080"  # UI 포트 (외부:내부)
```

### 문제: 메모리 부족

Elasticsearch는 최소 512MB의 메모리가 필요합니다. Docker Desktop에서 메모리 할당량을 확인하세요.

### 문제: Jenkins에서 환경 변수가 null로 표시됨

**원인:**
- `.env` 파일은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다
- Jenkins가 GitHub에서 코드를 가져올 때 `.env` 파일이 없어서 환경 변수가 `null`이 됩니다

**해결 방법:**
- Jenkins Global Environment에서 환경 변수를 직접 설정해야 합니다
- Jenkins 관리 → 시스템 설정 → Global properties → Environment variables

---

## 참고 자료

- [ReportPortal 공식 문서](https://reportportal.io/docs)
- [ReportPortal GitHub](https://github.com/reportportal/reportportal)
- [Playwright 리포터 문서](https://playwright.dev/docs/test-reporters)

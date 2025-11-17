# ReportPortal 도커 연동 가이드

이 가이드는 Playwright 테스트 결과를 ReportPortal에 연동하는 방법을 설명합니다.

## 1. ReportPortal 도커 컨테이너 실행

### 도커 Compose로 ReportPortal 시작

```bash
docker-compose -f docker-compose.reportportal.yml up -d
```

이 명령어는 다음 서비스들을 시작합니다:
- **PostgreSQL** (포트 5432): 데이터베이스
- **Elasticsearch** (포트 9200): 검색 엔진
- **MinIO** (포트 9000, 9001): 객체 스토리지
- **ReportPortal API** (포트 8080): 백엔드 API
- **ReportPortal UAT** (포트 8082): 웹 UI

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

## 2. ReportPortal 초기 설정

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
3. 생성된 Token을 복사하여 안전한 곳에 보관 (`.env` 파일에 저장)

## 3. 환경 변수 설정

### .env 파일에 ReportPortal 설정 추가

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# ReportPortal 설정
REPORTPORTAL_ENABLED=true
REPORTPORTAL_ENDPOINT=http://localhost:8082/api/v1
REPORTPORTAL_TOKEN=reportportal에서 생성한 API 토큰
REPORTPORTAL_PROJECT=test-automation
REPORTPORTAL_LAUNCH=Playwright Tests
```

**설명:**
- `REPORTPORTAL_ENABLED`: ReportPortal 연동 활성화 여부 (`true` 또는 `false`)
- `REPORTPORTAL_ENDPOINT`: ReportPortal API 서버 주소
- `REPORTPORTAL_TOKEN`: ReportPortal에서 생성한 API Token
- `REPORTPORTAL_PROJECT`: ReportPortal에서 생성한 프로젝트 이름
- `REPORTPORTAL_LAUNCH`: 테스트 실행 이름 (각 실행마다 구분됨)

## 4. 필요한 패키지 설치

```bash
npm install
```

또는

```bash
npm install @reportportal/agent-js-playwright
```

## 5. 테스트 실행

ReportPortal 연동이 활성화된 상태로 테스트를 실행합니다:

```bash
npm test
```

또는

```bash
npm run test:sanity
```

테스트 실행 후 ReportPortal 웹 UI (`http://localhost:8081`)에서 결과를 확인할 수 있습니다.

## 6. Jenkins와 연동

Jenkins에서도 ReportPortal을 사용하려면:

1. Jenkins 환경 변수에 ReportPortal 설정 추가:
   - Jenkins 관리 → 시스템 설정 → Global properties → Environment variables
   - 다음 변수 추가:
     ```
     REPORTPORTAL_ENABLED=true
     REPORTPORTAL_ENDPOINT=http://your-reportportal-server:8082
     REPORTPORTAL_TOKEN=your_api_token
     REPORTPORTAL_PROJECT=test-automation
     REPORTPORTAL_LAUNCH=Jenkins Build ${BUILD_NUMBER}
     ```

2. 또는 Jenkinsfile에서 직접 설정:
   ```groovy
   environment {
       REPORTPORTAL_ENABLED = 'true'
       REPORTPORTAL_ENDPOINT = 'http://your-reportportal-server:8082'
       REPORTPORTAL_TOKEN = credentials('reportportal-token')
       REPORTPORTAL_PROJECT = 'test-automation'
       REPORTPORTAL_LAUNCH = "Jenkins Build ${env.BUILD_NUMBER}"
   }
   ```

## 7. 문제 해결

### ReportPortal 서비스가 시작되지 않는 경우

```bash
# 서비스 상태 확인
docker-compose -f docker-compose.reportportal.yml ps

# 로그 확인
docker-compose -f docker-compose.reportportal.yml logs api
docker-compose -f docker-compose.reportportal.yml logs uat
```

### 포트 충돌 문제

`docker-compose.reportportal.yml` 파일에서 포트를 변경할 수 있습니다:

```yaml
ports:
  - "8082:8080"  # API 포트
  - "8081:8081"  # UI 포트
```


Elasticsearch는 최소 512MB의 메모리가 필요합니다. Docker Desktop에서 메모리 할당량을 확인하세요.

### 데이터베이스 마이그레이션 실패

```bash
# 마이그레이션 컨테이너 재실행
docker-compose -f docker-compose.reportportal.yml up migrations
```

## 8. 참고 자료

- [ReportPortal 공식 문서](https://reportportal.io/docs)
- [ReportPortal GitHub](https://github.com/reportportal/reportportal)
- [Playwright 리포터 문서](https://playwright.dev/docs/test-reporters)
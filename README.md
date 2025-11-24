<<<<<<< HEAD
# Playwright 테스트 자동화 프로젝트

게시판 애플리케이션을 위한 Playwright 테스트 자동화 프로젝트입니다. Jenkins CI/CD 파이프라인, PostgreSQL 데이터베이스, Grafana 대시보드를 통합한 완전한 테스트 자동화 시스템입니다.

## 주요 기능

- ✅ **Playwright 기반 E2E 테스트**: 안정적이고 빠른 테스트 실행
- ✅ **CI/CD 통합**: Jenkins를 통한 자동화된 테스트 실행
- ✅ **데이터 영속성**: PostgreSQL에 테스트 결과 저장 및 히스토리 관리
- ✅ **시각화 대시보드**: Grafana를 통한 실시간 테스트 결과 모니터링
- ✅ **알림 시스템**: Slack을 통한 테스트 결과 알림 및 리포트 링크 제공
- ✅ **Page Object Model**: 유지보수 가능한 테스트 코드 구조

## 시스템 아키텍처

```
개발자 → GitHub → Jenkins → Playwright → PostgreSQL → Grafana
                                              ↓
                                          Slack 알림
```

## 설치

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/kimys93/test_automation.git
cd test_automation
npm install
```

### 2. Playwright 브라우저 설치

```bash
npx playwright install
```

### 3. Docker Compose로 인프라 시작

```bash
docker compose up -d
```

이 명령은 다음 서비스를 시작합니다:
- **PostgreSQL** (포트: 5432): 테스트 결과 저장
- **Grafana** (포트: 3001): 대시보드 시각화

### 4. 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
# Base URL for test server
BASE_URL=http://IP주소:3000

# Jenkins URL (for Playwright Report links in Slack)
JENKINS_URL=http://IP주소:8080

# Grafana URL (for Dashboard links in Slack)
GRAFANA_URL=http://IP주소:3001

# Database Configuration
DB_HOST=IP주소
DB_PORT=5432
DB_NAME=test_automation
DB_USER=postgres
DB_PASSWORD=postgres

# Test Type (sanity, regression, etc.)
TEST_TYPE=sanity
```

## 테스트 실행

### 로컬에서 테스트 실행

#### 전체 테스트 실행
```bash
npm test
```

#### 기능별 테스트 실행
```bash
npm run test:functional
```

#### Sanity Test 실행 (핵심 기능만 빠르게 검증)
```bash
npm run test:sanity
```

#### Regression Test 실행 (전체 기능 종합 검증)
```bash
npm run test:regression
```

#### UI 모드로 실행
```bash
npm run test:ui
```

#### 헤드 모드로 실행 (브라우저 표시)
```bash
npm run test:headed
```

#### 디버그 모드로 실행
```bash
npm run test:debug
```

#### 테스트 리포트 보기
```bash
npm run test:report
```

### CI/CD 파이프라인 (Jenkins)

Jenkins에서 자동으로 다음 단계를 실행합니다:

1. **Checkout**: Git 저장소에서 코드 체크아웃
2. **Start Server**: Docker Compose로 PostgreSQL 및 Grafana 시작
3. **Install Dependencies**: npm 패키지 설치
4. **Run Sanity Tests**: Playwright 테스트 실행
5. **Process Test Results**: 테스트 결과 처리 및 HTML 리포트 생성
6. **Save Results to DB**: PostgreSQL에 테스트 결과 저장
7. **Send Slack Notification**: Slack에 테스트 결과 및 링크 전송

## 프로젝트 구조

```
test-automation/
├── pages/                    # Page Object 클래스들
│   ├── BasePage.js          # 기본 페이지 클래스
│   ├── LoginPage.js         # 로그인 페이지 객체
│   ├── BoardPage.js         # 게시판 페이지 객체
│   ├── WritePage.js         # 글쓰기 페이지 객체
│   ├── RegisterPage.js      # 회원가입 페이지 객체
│   ├── DetailPage.js        # 게시글 상세 페이지 객체
│   ├── ChatPage.js          # 채팅 페이지 객체
│   └── NotificationPage.js  # 알림 페이지 객체
├── tests/                    # 기능별 테스트 파일들
│   ├── example.spec.js      # 기본 예제 테스트
│   ├── login.spec.js        # 로그인 기능 테스트
│   ├── board.spec.js        # 게시판 기능 테스트
│   ├── write.spec.js        # 글쓰기 기능 테스트
│   ├── auth.spec.js         # 인증 통합 테스트
│   ├── chat.spec.js         # 채팅 기능 테스트
│   └── notification.spec.js # 알림 기능 테스트
├── tests-sanity/            # Sanity Test (핵심 기능 검증)
│   └── sanity.spec.js       # 핵심 기능만 빠르게 검증
├── tests-regression/         # Regression Test (전체 기능 검증)
│   └── regression.spec.js   # 모든 기능 종합 검증
├── scripts/                  # 유틸리티 스크립트
│   └── save-results-to-db.js # 테스트 결과를 DB에 저장
├── database/                 # 데이터베이스 스키마
│   └── schema.sql           # PostgreSQL 스키마 정의
├── grafana/                  # Grafana 설정
│   ├── dashboards/          # 대시보드 정의
│   │   └── test-automation-dashboard.json
│   └── provisioning/        # 프로비저닝 설정
│       ├── datasources/     # 데이터소스 설정
│       └── dashboards/      # 대시보드 프로비저닝
├── docker-compose.yml        # Docker Compose 설정
├── Dockerfile.server         # PostgreSQL 서버 Dockerfile
├── Jenkinsfile              # Jenkins 파이프라인 (macOS/Linux)
├── Jenkinsfile.windows      # Jenkins 파이프라인 (Windows)
├── playwright.config.js      # Playwright 설정
└── package.json             # 프로젝트 설정
```

## Page Object Model 패턴

각 페이지의 요소들과 메서드를 별도 파일로 분리하여 관리합니다:

- **유지보수성**: 요소 셀렉터 변경 시 한 곳만 수정
- **재사용성**: 여러 테스트에서 동일한 페이지 객체 재사용
- **가독성**: 테스트 코드가 더 간결하고 읽기 쉬움
- **확장성**: 새로운 페이지 추가가 용이

## 데이터베이스

### 스키마

PostgreSQL 데이터베이스는 다음 테이블로 구성됩니다:

- **test_runs**: 테스트 실행 정보 (run_id, test_type, status, 통계 등)
- **test_cases**: 개별 테스트 케이스 정보 (test_name, status, error_message, steps 등)
- **test_statistics**: 테스트 통계 뷰 (테스트별 실패율 등)

### 데이터 저장

테스트 실행 후 `scripts/save-results-to-db.js` 스크립트가 자동으로:
- `test_runs` 테이블에 실행 정보 저장
- `test_cases` 테이블에 각 테스트 케이스 정보 저장 (depth2 step 기준)
- `test_statistics` 뷰를 통해 통계 정보 제공

## Grafana 대시보드

### 접근 방법

1. Docker Compose로 서비스 시작:
   ```bash
   docker compose up -d
   ```

2. Grafana 접속:
   - URL: `http://IP주소:3001`
   - 기본 계정: `admin` / `admin`

3. 대시보드 확인:
   - 좌측 메뉴 → Dashboards → Test Automation Dashboard

### 대시보드 패널

1. **Test Runs Over Time**: 시간별 테스트 실행 추이
2. **Test Status Distribution**: 전체 테스트 상태 분포 (Passed/Failed/Skipped)
3. **Recent Test Runs**: 최근 테스트 실행 목록
4. **Test Failure Rate**: 테스트별 실패율 (Bar Chart)
5. **Daily Test Statistics**: 일별 테스트 통계
6. **Failed Test Error Logs**: 실패한 테스트의 상세 에러 정보

자세한 설정 방법은 [GRAFANA_SETUP.md](./GRAFANA_SETUP.md)를 참고하세요.

## Jenkins 설정

### 환경 변수 설정

Jenkins 관리 → 시스템 설정 → Global properties → Environment variables에서 다음 변수를 설정해야 합니다:

- **JENKINS_URL**: `http://IP주소:8080` (Jenkins 서버 주소)
- **GRAFANA_URL**: `http://IP주소:3001` (Grafana 서버 주소)
- **DB_HOST**: `127.0.0.1` (또는 Docker 네트워크 내부 주소)
- **DB_PORT**: `5432`
- **DB_NAME**: `test_automation`
- **DB_USER**: `postgres`
- **DB_PASSWORD**: `postgres`
- **TEST_TYPE**: `sanity` (또는 `regression`)

자세한 설정 방법은 [JENKINS_SETUP.md](./JENKINS_SETUP.md)를 참고하세요.

## Slack 통합

### 알림 설정

Slack 워크스페이스에 Jenkins 앱을 추가하고 토큰을 설정해야 합니다.

자세한 설정 방법은 [SLACK_SETUP.md](./SLACK_SETUP.md)를 참고하세요.

### 알림 내용

테스트 실행 후 Slack에 다음 정보가 전송됩니다:

- 테스트 결과 요약 (Total, Passed, Failed, Skipped)
- Grafana 대시보드 링크
- Playwright Report 링크
- 실패한 테스트 목록 (있는 경우)

## 테스트 디렉토리 설명

### tests/ - 기능별 테스트
각 기능을 세분화하여 테스트하는 디렉토리입니다.
- `login.spec.js`: 로그인 기능만 집중 테스트
- `board.spec.js`: 게시판 기능만 집중 테스트
- `write.spec.js`: 글쓰기 기능만 집중 테스트
- `auth.spec.js`: 인증 관련 통합 테스트
- `chat.spec.js`: 채팅 기능 테스트
- `notification.spec.js`: 알림 기능 테스트

### tests-sanity/ - Sanity Test
배포 전 핵심 기능만 빠르게 검증하는 테스트입니다.
- 빠른 실행 (약 1-2분)
- 핵심 기능만 검증 (로그인, 게시판 조회, 글쓰기 접근 등)
- CI/CD 파이프라인에서 자주 실행

### tests-regression/ - Regression Test
모든 기능을 종합적으로 검증하는 테스트입니다.
- 전체 기능 검증 (약 5-10분)
- 모든 페이지와 기능 포함
- 배포 전 최종 검증용

## 테스트 작성 가이드

### Page Object 사용 예제

```javascript
const { test, expect } = require('@playwright/test');
const BoardPage = require('../pages/BoardPage');

test.describe('게시판 기능', () => {
  let boardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.navigate();
  });

  test('검색 기능 테스트', async () => {
    await boardPage.search('테스트');
  });
});
```

### 새로운 Page Object 추가하기

1. `pages/` 디렉토리에 새 페이지 클래스 생성
2. `BasePage`를 상속받아 요소 셀렉터와 메서드 정의
3. 테스트 파일에서 해당 Page Object 사용

예제:

```javascript
// pages/NewPage.js
const BasePage = require('./BasePage');

class NewPage extends BasePage {
  constructor(page) {
    super(page);
  }

  get elementSelector() {
    return this.page.locator('#elementId');
  }

  async navigate() {
    await this.goto('/new-page');
  }

  async performAction() {
    await this.elementSelector.click();
  }
}

module.exports = NewPage;
```

## 주의사항

1. 테스트를 실행하기 전에 게시판 서버가 실행 중이어야 합니다.
2. `login.spec.js`와 `auth.spec.js`의 테스트 계정 정보를 실제 테스트 계정으로 변경해야 합니다.
3. 실제 테스트 환경에 맞게 셀렉터와 URL을 조정해야 할 수 있습니다.
4. Docker Compose를 사용하는 경우, Jenkins에서 Docker 명령어를 실행할 수 있는 권한이 필요합니다.
5. `.env` 파일은 Git에 커밋되지 않습니다 (`.gitignore`에 포함됨)

## 문서

- [GRAFANA_SETUP.md](./GRAFANA_SETUP.md): Grafana 대시보드 설정 가이드
- [JENKINS_SETUP.md](./JENKINS_SETUP.md): Jenkins CI/CD 파이프라인 설정 가이드
- [SLACK_SETUP.md](./SLACK_SETUP.md): Slack 알림 설정 가이드

## 기술 스택

- **Testing Framework**: Playwright
- **CI/CD**: Jenkins
- **Database**: PostgreSQL 15
- **Visualization**: Grafana
- **Notification**: Slack
- **Container**: Docker & Docker Compose
- **Language**: JavaScript (Node.js)
- **Version Control**: Git (GitHub, GitLab)

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> 63a4cf1180b759b939bc8b90dae2862b3ec81698

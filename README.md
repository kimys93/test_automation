# Playwright 테스트 자동화 프로젝트

게시판 애플리케이션을 위한 Playwright 테스트 자동화 프로젝트입니다. Jenkins CI/CD 파이프라인과 ReportPortal을 통합한 완전한 테스트 자동화 시스템입니다.

## 주요 기능

- ✅ **Playwright 기반 E2E 테스트**: 안정적이고 빠른 테스트 실행
- ✅ **CI/CD 통합**: Jenkins를 통한 자동화된 테스트 실행
- ✅ **ReportPortal 통합**: 중앙화된 테스트 결과 관리 및 시각화
- ✅ **알림 시스템**: Slack을 통한 테스트 결과 알림 및 리포트 링크 제공
- ✅ **Page Object Model**: 유지보수 가능한 테스트 코드 구조

## 시스템 아키텍처

```
개발자 → GitLab → Jenkins → Playwright → ReportPortal
                                              ↓
                                          Slack 알림
```

## 설치

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone http://gitlab.ngle.co.kr/platformqa/macaron/test_automation.git
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
- **ReportPortal UI** (포트: 8082): 테스트 결과 시각화
- **ReportPortal Gateway** (포트: 8082): UI 및 API 게이트웨이
- **ReportPortal DB** (포트: 5432): 데이터베이스

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

프로젝트에는 두 가지 Jenkinsfile이 제공됩니다:

#### Jenkinsfile (ReportPortal 통합 버전)

**용도**: ReportPortal을 사용하여 테스트 결과를 중앙에서 관리하고 시각화하는 경우 사용

**특징**:
- ✅ ReportPortal 통합 (테스트 결과 자동 전송)
- ✅ Allure Plugin 리포트 생성
- ✅ Slack 알림 (Allure Report + ReportPortal Dashboard 링크)
- ✅ ReportPortal credential 필요 (`slack-reportportal-token`)

**사용 시나리오**:
- 테스트 결과를 ReportPortal에서 중앙 관리하고 싶을 때
- 팀 전체가 테스트 결과를 공유하고 분석해야 할 때
- 테스트 히스토리와 트렌드 분석이 필요할 때

#### Jenkinsfile.allure (Allure 전용 버전)

**용도**: ReportPortal 없이 Allure 리포트만 사용하는 경우 사용

**특징**:
- ✅ Allure Plugin 리포트 생성
- ✅ Slack 알림 (Allure Report 링크만)
- ❌ ReportPortal 통합 없음
- ❌ ReportPortal credential 불필요

**사용 시나리오**:
- ReportPortal 인프라가 없거나 사용하지 않을 때
- 간단하게 Allure 리포트만으로 충분할 때
- 빠르게 테스트를 실행하고 결과를 확인하고 싶을 때

#### Jenkins 파이프라인 실행 단계

두 Jenkinsfile 모두 다음 단계를 실행합니다:

1. **Checkout**: Git 저장소에서 코드 체크아웃
2. **Install Dependencies**: npm 패키지 설치
3. **Run Sanity Tests**: Playwright 테스트 실행
4. **Generate Allure Report**: Allure Plugin으로 리포트 자동 생성
5. **Send Slack Notification**: Slack에 테스트 결과 및 리포트 링크 전송

### ReportPortal 통합

ReportPortal은 테스트 결과를 중앙에서 관리하고 시각화하는 플랫폼입니다.

#### ReportPortal 시작하기

1. **Docker Compose로 ReportPortal 시작**:
```bash
docker compose up -d reportportal
```

2. **ReportPortal 접속**:
   - UI: `http://IP주소:8082`
   - 기본 계정: `default/1q2w3e` (첫 접속 시 변경 필요)

3. **프로젝트 및 사용자 생성**:
   - ReportPortal UI에서 프로젝트 생성
   - 사용자 생성 및 API Token 발급

4. **Jenkins Credential 설정**:
     - Jenkins 관리 → Credentials → System → Global credentials → Add Credentials
     - Type: Secret text
     - Secret: ReportPortal API Token
     - ID: `reportportal-token`

5. **테스트 실행**:
```bash
npm run test:sanity
```

테스트 결과가 자동으로 ReportPortal에 전송됩니다.

#### ReportPortal 장점

- ✅ 중앙화된 테스트 결과 관리
- ✅ 실시간 대시보드 및 분석
- ✅ 자동화된 리포트 생성
- ✅ 이슈 추적 및 관리
- ✅ 히스토리 추적 및 트렌드 분석

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
├── docker-compose.yml        # Docker Compose 설정
├── Jenkinsfile              # Jenkins 파이프라인 (ReportPortal 통합 버전)
├── Jenkinsfile.allure       # Jenkins 파이프라인 (Allure 전용 버전)
├── playwright.config.js      # Playwright 설정
└── package.json             # 프로젝트 설정
```

## Page Object Model 패턴

각 페이지의 요소들과 메서드를 별도 파일로 분리하여 관리합니다:

- **유지보수성**: 요소 셀렉터 변경 시 한 곳만 수정
- **재사용성**: 여러 테스트에서 동일한 페이지 객체 재사용
- **가독성**: 테스트 코드가 더 간결하고 읽기 쉬움
- **확장성**: 새로운 페이지 추가가 용이

## Jenkins 설정

### 환경 변수 설정

Jenkins 관리 → 시스템 설정 → Global properties → Environment variables에서 다음 변수를 설정해야 합니다:

- **JENKINS_URL**: `http://IP주소:8080` (Jenkins 서버 주소)
- **TEST_TYPE**: `sanity` (또는 `regression`)
- **RP_ENDPOINT**: `http://IP주소:8082/api` (ReportPortal API 주소 - Traefik Gateway를 통해 접근)
- **RP_TOKEN**: Jenkins Credential로 관리 (Credential ID: `reportportal-token`)
- **참고**: `RP_ENABLED`와 `RP_PROJECT`는 코드에 하드코딩되어 있습니다 (항상 활성화, 프로젝트명: `test_automation`)

자세한 설정 방법은 [JENKINS_SETUP.md](./JENKINS_SETUP.md)를 참고하세요.

## Slack 통합

### 알림 설정

Slack 워크스페이스에 Jenkins 앱을 추가하고 토큰을 설정해야 합니다.

자세한 설정 방법은 [SLACK_SETUP.md](./SLACK_SETUP.md)를 참고하세요.

### 알림 내용

테스트 실행 후 Slack에 다음 정보가 전송됩니다:

- 테스트 결과 요약 (Total, Passed, Failed, Skipped)
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

## 문서

- [SLACK_SETUP.md](./SLACK_SETUP.md): Slack 알림 설정 가이드

## 기술 스택

- **Testing Framework**: Playwright
- **CI/CD**: Jenkins
- **Test Management**: ReportPortal
- **Notification**: Slack
- **Container**: Docker & Docker Compose
- **Language**: JavaScript (Node.js)
- **Version Control**: Git (GitLab)

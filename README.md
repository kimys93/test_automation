# Playwright 테스트 자동화 프로젝트

게시판 애플리케이션을 위한 Playwright 테스트 자동화 프로젝트입니다.

## 설치

```bash
npm install
```

## Playwright 브라우저 설치

```bash
npx playwright install
```

## 테스트 실행

### 전체 테스트 실행
```bash
npm test
```

### 기능별 테스트 실행 (tests/)
```bash
npm run test:functional
```

### Sanity Test 실행 (핵심 기능만 빠르게 검증)
```bash
npm run test:sanity
```

### Regression Test 실행 (전체 기능 종합 검증)
```bash
npm run test:regression
```

### UI 모드로 실행
```bash
npm run test:ui
```

### 헤드 모드로 실행 (브라우저 표시)
```bash
npm run test:headed
```

### 디버그 모드로 실행
```bash
npm run test:debug
```

### 테스트 리포트 보기
```bash
npm run test:report
```

## 프로젝트 구조

이 프로젝트는 **Page Object Model (POM)** 패턴을 사용합니다.

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
├── playwright.config.js     # Playwright 설정
└── package.json             # 프로젝트 설정
```

## Page Object Model 패턴

각 페이지의 요소들과 메서드를 별도 파일로 분리하여 관리합니다:

- **유지보수성**: 요소 셀렉터 변경 시 한 곳만 수정
- **재사용성**: 여러 테스트에서 동일한 페이지 객체 재사용
- **가독성**: 테스트 코드가 더 간결하고 읽기 쉬움
- **확장성**: 새로운 페이지 추가가 용이

## 설정

### 환경 변수 설정

보안을 위해 서버 URL은 환경 변수로 관리합니다.

1. **`.env` 파일 생성**
   ```bash
   cp .env.example .env
   ```

2. **`.env` 파일 편집**
   ```env
   BASE_URL=http://192.168.219.105:3000
   JENKINS_URL=http://192.168.219.105:8080
   ```
   실제 테스트 서버와 Jenkins 서버의 IP 주소와 포트를 입력하세요.

3. **Jenkins 환경 변수 설정 (Jenkinsfile에서 사용)**
   - Jenkins 관리 → 시스템 설정 (Manage Jenkins → Configure System)
   - Global properties → Environment variables 체크
   - Add → Name: `JENKINS_URL`, Value: `http://192.168.219.105:8080`
   - 저장

4. **주의사항**
   - `.env` 파일은 Git에 커밋되지 않습니다 (`.gitignore`에 포함됨)
   - 각 환경(로컬, CI/CD 등)에 맞게 별도로 설정하세요
   - `.env.example` 파일은 템플릿으로만 사용됩니다

### 기타 설정

`playwright.config.js` 파일에서 다음 설정을 변경할 수 있습니다:

- `timeout`: 테스트 실행 최대 시간
- `workers`: 병렬 실행할 워커 수

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

## 주의사항

1. 테스트를 실행하기 전에 게시판 서버가 실행 중이어야 합니다.
2. `login.spec.js`와 `auth.spec.js`의 테스트 계정 정보를 실제 테스트 계정으로 변경해야 합니다.
3. 실제 테스트 환경에 맞게 셀렉터와 URL을 조정해야 할 수 있습니다.

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


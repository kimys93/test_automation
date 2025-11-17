// @ts-check
import { defineConfig, devices } from '@playwright/test';
// @ts-ignore - dotenv 타입 선언이 없어도 정상 동작
import dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

/**
 * 리포트 설정 함수
 * ReportPortal이 활성화된 경우 리포터 배열에 추가
 */
function getReporters() {
  /** @type {import('@playwright/test').ReporterDescription[]} */
  const reporters = [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ];

  // ReportPortal 리포터 (환경 변수 설정 시 활성화)
  if (process.env.REPORTPORTAL_ENABLED === 'true') {
    reporters.push([
      '@reportportal/agent-js-playwright',
      {
        endpoint: process.env.REPORTPORTAL_ENDPOINT,
        token: process.env.REPORTPORTAL_TOKEN || '',
        launch: process.env.REPORTPORTAL_LAUNCH || `Playwright Tests - ${new Date().toISOString()}`,
        project: process.env.REPORTPORTAL_PROJECT || 'default_project',
        description: process.env.REPORTPORTAL_DESCRIPTION || 'Playwright 테스트 실행 결과',
        attributes: [
          { key: 'browser', value: 'chromium' },
          { key: 'env', value: process.env.CI ? 'CI' : 'local' },
          { key: 'testType', value: (process.env.TEST_TYPE && process.env.TEST_TYPE !== 'null' && process.env.TEST_TYPE.trim() !== '') ? process.env.TEST_TYPE : 'sanity' }
        ],
        // 테스트 결과에 스크린샷 포함
        attachPicturesToLogs: true,
        // 실패한 테스트에만 상세 정보 포함
        skippedIssue: false,
        // 테스트 실행 모드
        mode: 'DEFAULT'
      }
    ]);
  }

  return reporters;
}

/**
 * Playwright 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // testDir은 명령어 인자로 지정 가능하도록 주석 처리
  // testDir: './tests',
  /* 테스트 실행 최대 시간 */
  timeout: 30 * 1000,
  expect: {
    /* expect assertions의 타임아웃 */
    timeout: 5000
  },
  /* 테스트를 병렬로 실행 */
  fullyParallel: true,
  /* CI에서 실패한 테스트를 재시도 */
  retries: process.env.CI ? 1 : 0,
  /* 병렬 실행할 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포트 설정 */
  reporter: getReporters(),
  /* 공유 설정 */
  use: {
    /* 기본 URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    /* 브라우저 컨텍스트 옵션 */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* 액션 타임아웃 */
    actionTimeout: 10000,
    /* 네비게이션 타임아웃 */
    navigationTimeout: 30000,
    /* 브라우저를 전체 화면으로 실행 */
    viewport: null,
  },

  /* 테스트할 프로젝트들 */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* 브라우저를 최대화된 상태로 실행 */
        launchOptions: {
          args: ['--start-maximized']
        }
      },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 로컬 개발 서버 설정 */
  // webServer: {
  //   command: 'npm start',
  //   url: process.env.BASE_URL || 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});


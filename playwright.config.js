// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

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
  retries: process.env.CI ? 2 : 0,
  /* 병렬 실행할 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포트 설정 */
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
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
  },

  /* 테스트할 프로젝트들 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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


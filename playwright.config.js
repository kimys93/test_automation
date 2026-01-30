// @ts-check
import { defineConfig, devices } from '@playwright/test';
// @ts-ignore - dotenv 타입 선언이 없어도 정상 동작
import dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

/**
 * 리포트 설정 함수
 */
function getReporters() {
  /** @type {import('@playwright/test').ReporterDescription[]} */
  const reporters = [
    // HTML 리포트는 생성하되 서버는 시작하지 않음 (별도 리포트 서버 사용)
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    // Allure 리포트 생성 (ReportPortal 첨부용)
    ['allure-playwright', { outputFolder: 'allure-results' }]
  ];

  // ReportPortal 설정 (RP_TOKEN이 설정된 경우에만 활성화)
  if (process.env.RP_TOKEN) {
    // BUILD_NUMBER는 환경 변수에서 가져오거나 Date.now()로 동적 생성
    const buildNumber = Date.now().toString();
    // launch 이름은 환경 변수에서 가져오거나 기본값 사용
    const launchName = 'sanity';
    
    const rpConfig = {
      token: process.env.RP_TOKEN, // Jenkins Credential에서만 가져옴 (필수)
      endpoint: 'http://10.10.0.30:8082/api/v1', // 환경 변수에서 가져오거나 기본값
      project: 'test_automation', // 환경 변수에서 가져오거나 기본값
      launch: launchName, // 환경 변수에서 가져오거나 기본값
      attributes: [
        {
          value: 'sanity' // 대시보드 필터링용 (key 없이 value만)
        },
        {
          key: 'testType',
          value: 'sanity' // Hardcoded
        },
        {
          key: 'environment',
          value: 'CI' // Hardcoded
        },
        {
          key: 'build',
          value: buildNumber // Hardcoded (Date.now() 기반)
        }
      ],
      description: `Test run: sanity - Build: ${buildNumber}`, // Hardcoded
      mode: 'DEFAULT', // Hardcoded
      debug: false // Hardcoded
    };

    reporters.push(['@reportportal/agent-js-playwright', rpConfig]);
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
  retries: 1, // Hardcoded
  /* 병렬 실행할 워커 수 */
  workers: 1, // Hardcoded
  /* 리포트 설정 */
  reporter: getReporters(),
  /* 공유 설정 */
  use: {
    /* 기본 URL */
    baseURL: 'http://192.168.219.103:3000/',
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
                args: [
                  '--start-maximized',
                  '--no-sandbox',
                  '--disable-setuid-sandbox'
                ]
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


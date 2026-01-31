#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정
const CONFIG = {
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  REPORTPORTAL_URL: process.env.RP_ENDPOINT || 'http://172.20.212.161:8082',
  ALLURE_RESULTS_DIR: 'allure-results',
  ALLURE_REPORT_DIR: 'allure-report',
  ALLURE_PORT: 9090,
  TEST_RESULTS_FILE: 'test-results/results.json',
  TEST_TYPE: process.env.TEST_TYPE || 'sanity'
};

// 테스트 결과 파싱
function parseTestResults(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    console.log('results.json 파일을 찾을 수 없습니다.');
    return null;
  }

  const resultsJson = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  const failedTestList = [];

  // suites 구조를 순회하면서 실제 테스트 결과를 집계
  const suitesToProcess = [];
  if (resultsJson.suites && Array.isArray(resultsJson.suites)) {
    suitesToProcess.push(...resultsJson.suites);
  }

  while (suitesToProcess.length > 0) {
    const currentSuite = suitesToProcess.shift();

    // 중첩된 suites 추가
    if (currentSuite.suites && Array.isArray(currentSuite.suites)) {
      suitesToProcess.push(...currentSuite.suites);
    }

    // specs 처리 - 각 테스트의 실제 결과를 집계
    if (currentSuite.specs && Array.isArray(currentSuite.specs)) {
      for (const spec of currentSuite.specs) {
        if (spec.tests && Array.isArray(spec.tests)) {
          for (const test of spec.tests) {
            if (test.results && Array.isArray(test.results) && test.results.length > 0) {
              // 마지막 결과가 최종 상태 (retry 고려)
              const finalResult = test.results[test.results.length - 1];
              if (finalResult) {
                const resultStatus = finalResult.status || 'unknown';
                const testTitle = spec.title || 'Unknown Test';

                totalTests++;

                if (resultStatus === 'passed') {
                  passedTests++;
                } else if (['failed', 'timedout', 'interrupted'].includes(resultStatus)) {
                  failedTests++;
                  failedTestList.push(`• ${testTitle} [${resultStatus.charAt(0).toUpperCase() + resultStatus.slice(1)}]`);
                } else if (resultStatus === 'skipped') {
                  skippedTests++;
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    failedTestList
  };
}

// Slack 메시지 전송
async function sendSlackMessage(results) {
  if (!CONFIG.SLACK_WEBHOOK_URL) {
    console.log('⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다. Slack 알림을 건너뜁니다.');
    return;
  }

  const testStatus = results.failedTests > 0 || results.skippedTests > 0 ? 'Fail' : 'Success';
  // RP_ENDPOINT에서 /api/v1 제거하고 UI URL 생성
  const rpBaseUrl = CONFIG.REPORTPORTAL_URL.replace('/api/v1', '');
  const reportPortalUrl = `${rpBaseUrl}/ui/#test_automation/launches/all`;
  const allureReportUrl = `http://172.20.212.161:${CONFIG.ALLURE_PORT}`;

  let failureListMessage = '';
  if (results.failedTestList.length > 0) {
    failureListMessage = `\n:warning: *Failed Tests:*\n${results.failedTestList.join('\n')}`;
  }

  const statusEmoji = testStatus === 'Success'
    ? ':white_check_mark: Success - 모든 테스트 성공'
    : ':red_circle: Fail - 실패한 케이스 확인 필요';

  const message = `*Test Status:*
Total Tests: ${results.totalTests}, Passed: ${results.passedTests}, Failed: ${results.failedTests}, Skipped: ${results.skippedTests}
:bar_chart: <${allureReportUrl}|Allure Report>
:mag: <${reportPortalUrl}|ReportPortal Dashboard>
${statusEmoji}${failureListMessage}`;

  const payload = {
    text: message,
    attachments: [{
      color: testStatus === 'Success' ? 'good' : 'danger',
      text: ''
    }]
  };

  try {
    const response = await fetch(CONFIG.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Slack 메시지 전송 성공!');
    } else {
      console.log('❌ Slack 메시지 전송 실패:', response.status);
    }
  } catch (error) {
    console.log('❌ Slack 메시지 전송 실패:', error.message);
  }
}

// Allure 리포트 생성
function generateAllureReport() {
  console.log('\n📊 Allure 리포트 생성 중...');
  try {
    execSync(`npx allure generate ${CONFIG.ALLURE_RESULTS_DIR} --clean -o ${CONFIG.ALLURE_REPORT_DIR}`, {
      stdio: 'inherit'
    });
    console.log(`✅ Allure 리포트 생성 완료: ${path.resolve(CONFIG.ALLURE_REPORT_DIR)}`);
    return true;
  } catch (error) {
    console.log('⚠️ Allure 리포트 생성 실패:', error.message);
    return false;
  }
}

// 테스트 실행
function runTests() {
  const testCommand = CONFIG.TEST_TYPE === 'sanity'
    ? 'npm run test:sanity'
    : `npx playwright test tests/${CONFIG.TEST_TYPE}.spec.js`;

  console.log(`\n🧪 테스트 실행: ${testCommand}`);

  try {
    execSync(testCommand, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (error) {
    console.log('⚠️ 테스트 실행 중 일부 실패가 있습니다.');
    return false;
  }
}

// 메인 실행
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 로컬 테스트 실행 시작');
  console.log('='.repeat(60));

  // 1. 테스트 실행
  runTests();

  // 2. Allure 리포트 생성
  generateAllureReport();

  // 3. 테스트 결과 파싱
  const results = parseTestResults(CONFIG.TEST_RESULTS_FILE);

  if (results) {
    console.log('\n📈 테스트 결과:');
    console.log(`   Total: ${results.totalTests}`);
    console.log(`   Passed: ${results.passedTests}`);
    console.log(`   Failed: ${results.failedTests}`);
    console.log(`   Skipped: ${results.skippedTests}`);

    // 4. Slack 알림 전송
    await sendSlackMessage(results);
  }

  // 5. Allure 리포트 서버 띄우기 (0.0.0.0 바인딩으로 외부 접속 허용)
  console.log(`\n🌐 Allure 리포트 서버 시작 (http://172.20.212.161:${CONFIG.ALLURE_PORT})...`);
  const { spawn } = await import('child_process');
  const allureServer = spawn('python3', ['-m', 'http.server', String(CONFIG.ALLURE_PORT), '--bind', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(CONFIG.ALLURE_REPORT_DIR)
  });

  allureServer.on('error', (err) => {
    console.log('⚠️ Allure 서버 시작 실패:', err.message);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ 완료 - Allure 서버가 실행 중입니다');
  console.log(`📊 Allure Report: http://172.20.212.161:${CONFIG.ALLURE_PORT}`);
  console.log('🛑 종료하려면 Ctrl+C를 누르세요');
  console.log('='.repeat(60));
}

main().catch(console.error);

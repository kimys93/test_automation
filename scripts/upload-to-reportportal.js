// @ts-check
/**
 * Playwright results.json 파일을 파싱하여 ReportPortal에 업로드하는 스크립트
 * test.step()을 Depth 2 기준으로 개별 테스트 케이스로 카운팅
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RPClient from '@reportportal/client-javascript';
import dotenv from 'dotenv';

// ES 모듈에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config();

/**
 * results.json 파일을 파싱하여 ReportPortal에 업로드
 */
async function uploadToReportPortal() {
  const resultsJsonPath = path.join(__dirname, '..', 'test-results', 'results.json');
  
  if (!fs.existsSync(resultsJsonPath)) {
    console.error(`❌ results.json 파일을 찾을 수 없습니다: ${resultsJsonPath}`);
    process.exit(1);
  }

  // results.json 읽기
  const resultsJson = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));
  
  // ReportPortal 설정 확인
  if (process.env.REPORTPORTAL_ENABLED !== 'true') {
    console.error('❌ REPORTPORTAL_ENABLED가 true로 설정되지 않았습니다.');
    process.exit(1);
  }

  const endpoint = process.env.REPORTPORTAL_ENDPOINT;
  const token = process.env.REPORTPORTAL_TOKEN;
  const project = process.env.REPORTPORTAL_PROJECT || 'test-automation';
  const launch = process.env.REPORTPORTAL_LAUNCH || `Playwright Tests - ${new Date().toISOString()}`;
  const description = process.env.REPORTPORTAL_DESCRIPTION || 'Playwright 테스트 실행 결과 (JSON 업로드)';

  if (!endpoint || !token) {
    console.error('❌ REPORTPORTAL_ENDPOINT 또는 REPORTPORTAL_TOKEN이 설정되지 않았습니다.');
    process.exit(1);
  }

  // ReportPortal 클라이언트 초기화
  const client = new RPClient({
    token: token,
    endpoint: endpoint,
    launch: launch,
    project: project,
    description: description,
    attributes: [
      { key: 'browser', value: 'chromium' },
      { key: 'env', value: process.env.CI ? 'CI' : 'local' },
      { key: 'testType', value: process.env.TEST_TYPE || 'sanity' },
      { key: 'source', value: 'json-upload' }
    ],
    mode: 'DEFAULT'
  }, {
    agent: {
      keepAlive: true
    }
  });

  try {
    // Launch 시작
    console.log('🚀 ReportPortal Launch 시작...');
    const launchInfo = await client.startLaunch({
      name: launch,
      description: description,
      attributes: [
        { key: 'browser', value: 'chromium' },
        { key: 'env', value: process.env.CI ? 'CI' : 'local' },
        { key: 'testType', value: process.env.TEST_TYPE || 'sanity' },
        { key: 'source', value: 'json-upload' }
      ],
      mode: 'DEFAULT'
    });

    const launchId = launchInfo.id;
    console.log(`✅ Launch 생성 완료: ${launchId}`);

    // 테스트 결과 파싱 및 업로드
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    /**
     * 테스트 스펙 파싱 (각 spec이 test.step()에 해당)
     */
    async function processSpecs(specs, parentItemId) {
      if (!specs || !Array.isArray(specs)) return;

      for (const spec of specs) {
        // 각 spec은 개별 테스트 케이스 (Depth 2 기준)
        if (spec.title) {
          totalTests++;
          
          // 테스트 결과 확인
          let status = 'PASSED';
          let errorMessage = null;
          
          if (spec.tests && Array.isArray(spec.tests)) {
            for (const test of spec.tests) {
              if (test.results && Array.isArray(test.results)) {
                for (const result of test.results) {
                  if (result.status === 'failed') {
                    status = 'FAILED';
                    if (result.error) {
                      errorMessage = result.error.message || 'Test failed';
                    }
                  } else if (result.status === 'skipped') {
                    status = 'SKIPPED';
                  }
                }
              }
            }
          }
          
          if (status === 'PASSED') passedTests++;
          else if (status === 'FAILED') failedTests++;
          else if (status === 'SKIPPED') skippedTests++;

          // 테스트 아이템 시작
          const testItem = await client.startTestItem({
            name: spec.title,
            type: 'TEST',
            description: spec.title,
            hasStats: true
          }, launchId, parentItemId || undefined);

          // 에러 로그 추가
          if (errorMessage) {
            await client.sendLog(testItem.id, {
              level: 'ERROR',
              message: errorMessage
            });
          }

          // 테스트 결과의 steps 처리 (Depth 3 이상)
          if (spec.tests && Array.isArray(spec.tests)) {
            for (const test of spec.tests) {
              if (test.results && Array.isArray(test.results)) {
                for (const result of test.results) {
                  if (result.steps && Array.isArray(result.steps)) {
                    await processSteps(result.steps, testItem.id);
                  }
                }
              }
            }
          }

          // 테스트 아이템 종료
          await client.finishTestItem(testItem.id, {
            status: status,
            issue: status === 'FAILED' ? {
              issueType: 'PRODUCT_BUG',
              comment: errorMessage || 'Test failed'
            } : undefined
          });
        }
      }
    }

    /**
     * test.step()의 하위 단계를 로그로 처리 (Depth 3 이상)
     */
    async function processSteps(steps, parentItemId) {
      if (!steps || !Array.isArray(steps)) return;

      for (const step of steps) {
        if (step.title) {
          // 하위 단계는 로그로 추가
          const logLevel = step.error ? 'ERROR' : 'INFO';
          const logMessage = step.title + (step.error ? `: ${step.error.message}` : '');
          
          await client.sendLog(parentItemId, {
            level: logLevel,
            message: logMessage
          });

          // 중첩된 steps 처리
          if (step.steps && Array.isArray(step.steps)) {
            await processSteps(step.steps, parentItemId);
          }
        }
      }
    }

    // Suites 처리
    if (resultsJson.suites && Array.isArray(resultsJson.suites)) {
      for (const suite of resultsJson.suites) {
        // 중첩된 suites 처리 (test.describe.serial() 구조)
        if (suite.suites && Array.isArray(suite.suites)) {
          for (const nestedSuite of suite.suites) {
            // Suite 시작 (test.describe.serial() 블록)
            // @ts-ignore - ReportPortal 클라이언트 타입 정의 문제
            const suiteItem = await client.startTestItem({
              name: nestedSuite.title || 'Test Suite',
              type: 'SUITE',
              description: nestedSuite.title || 'Test Suite'
            }, launchId);

            // 각 spec을 개별 테스트로 처리
            if (nestedSuite.specs && Array.isArray(nestedSuite.specs)) {
              await processSpecs(nestedSuite.specs, suiteItem.id);
            }

            // Suite 종료
            await client.finishTestItem(suiteItem.id, {
              status: 'PASSED'
            });
          }
        } else if (suite.specs && Array.isArray(suite.specs)) {
          // 직접 specs가 있는 경우
          await processSpecs(suite.specs);
        }
      }
    }

    // Launch 종료
    const finalStatus = failedTests > 0 ? 'FAILED' : 'PASSED';
    await client.finishLaunch(launchId, {
      status: finalStatus
    });

    console.log('\n📊 업로드 완료!');
    console.log(`   총 테스트: ${totalTests}`);
    console.log(`   통과: ${passedTests}`);
    console.log(`   실패: ${failedTests}`);
    console.log(`   스킵: ${skippedTests}`);
    console.log(`\n✅ ReportPortal에 결과가 업로드되었습니다.`);
    console.log(`   Launch ID: ${launchId}`);

  } catch (error) {
    console.error('❌ ReportPortal 업로드 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadToReportPortal().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});


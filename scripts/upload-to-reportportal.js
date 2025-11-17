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
     * result.steps[] 배열의 최상위 레벨 step들을 개별 테스트로 처리 (Depth 2 기준)
     * Jenkinsfile.windows의 Slack send 로직과 동일
     */
    async function processResultSteps(result, parentItemId) {
      if (!result.steps || !Array.isArray(result.steps)) return;

      const processedStepTitles = new Set(); // 중복 방지
      const resultStatus = result.status || 'passed';

      for (const depth2Step of result.steps) {
        const stepTitle = depth2Step.title || '';
        
        // 이미 처리한 step이면 건너뛰기 (중복 방지)
        if (stepTitle && processedStepTitles.has(stepTitle)) {
          continue;
        }

        // depth2만 카운트 (depth3는 depth2Step.steps가 있지만 카운트하지 않음)
        totalTests++;
        processedStepTitles.add(stepTitle);

        // depth2 step 내부에 error가 있는지 확인 (depth3까지 확인)
        let depth2StepHasError = false;

        // depth2 step 자체에 error 필드가 있는지 확인
        if (depth2Step.error) {
          depth2StepHasError = true;
        }

        // depth2 step의 하위 step들(depth3)을 확인하여 error가 있는지 찾기
        if (!depth2StepHasError && depth2Step.steps && Array.isArray(depth2Step.steps)) {
          for (const depth3Step of depth2Step.steps) {
            // depth3 step 자체에 error가 있는지 확인
            if (depth3Step.error) {
              depth2StepHasError = true;
              break;
            }
            // depth3 step의 하위 step들(depth4) 확인
            if (depth3Step.steps && Array.isArray(depth3Step.steps)) {
              for (const depth4Step of depth3Step.steps) {
                if (depth4Step.error) {
                  depth2StepHasError = true;
                  break;
                }
              }
              if (depth2StepHasError) {
                break;
              }
            }
          }
        }

        // result.errors 배열에서 에러 확인
        if (!depth2StepHasError && result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          // result.errors에 에러가 있으면, 해당 depth2 step이 실패한 것으로 간주할 수 있음
          // 하지만 정확한 매칭은 어려우므로 여기서는 depth2StepHasError가 false인 경우는 passed로 처리
        }

        // depth2 step의 실제 실패 여부에 따라 상태 결정
        let status = 'PASSED';
        if (resultStatus === 'failed' || resultStatus === 'timedout' || resultStatus === 'interrupted') {
          // depth2 step에 실제로 error가 있는 경우만 실패로 처리
          if (depth2StepHasError) {
            status = 'FAILED';
            failedTests++;
          } else {
            // depth2 step에 error가 없으면 passed로 처리
            status = 'PASSED';
            passedTests++;
          }
        } else if (resultStatus === 'skipped') {
          status = 'SKIPPED';
          skippedTests++;
        } else {
          // passed
          if (depth2StepHasError) {
            status = 'FAILED';
            failedTests++;
          } else {
            status = 'PASSED';
            passedTests++;
          }
        }

        // 테스트 아이템 시작
        const testItem = await client.startTestItem({
          name: stepTitle || 'Unnamed Step',
          type: 'TEST',
          description: stepTitle || 'Unnamed Step',
          hasStats: true
        }, launchId, parentItemId || undefined);

        // 에러 로그 추가
        if (depth2StepHasError) {
          const errorMessage = depth2Step.error?.message || 
                              (result.errors && result.errors[0]?.message) || 
                              'Test failed';
          await client.sendLog(testItem.id, {
            level: 'ERROR',
            message: errorMessage
          });
        }

        // depth2 step의 하위 step들(depth3 이상)을 로그로 처리
        if (depth2Step.steps && Array.isArray(depth2Step.steps)) {
          await processStepsAsLogs(depth2Step.steps, testItem.id);
        }

        // 테스트 아이템 종료
        await client.finishTestItem(testItem.id, {
          status: status,
          issue: status === 'FAILED' ? {
            issueType: 'PRODUCT_BUG',
            comment: depth2Step.error?.message || 'Test failed'
          } : undefined
        });
      }
    }

    /**
     * test.step()의 하위 단계를 로그로 처리 (Depth 3 이상)
     */
    async function processStepsAsLogs(steps, parentItemId) {
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
            await processStepsAsLogs(step.steps, parentItemId);
          }
        }
      }
    }

    // Suites 처리
    if (resultsJson.suites && Array.isArray(resultsJson.suites)) {
      for (const suite of resultsJson.suites) {
        // 중첩된 suites 처리
        if (suite.suites && Array.isArray(suite.suites)) {
          for (const nestedSuite of suite.suites) {
            // Suite 시작
            // @ts-ignore - ReportPortal 클라이언트 타입 정의 문제
            const suiteItem = await client.startTestItem({
              name: nestedSuite.title || 'Test Suite',
              type: 'SUITE',
              description: nestedSuite.title || 'Test Suite'
            }, launchId);

            // 각 spec의 result.steps[] 배열 처리 (Jenkinsfile 로직과 동일)
            if (nestedSuite.specs && Array.isArray(nestedSuite.specs)) {
              for (const spec of nestedSuite.specs) {
                if (spec.tests && Array.isArray(spec.tests)) {
                  for (const test of spec.tests) {
                    if (test.results && Array.isArray(test.results)) {
                      // result가 여러 개일 수 있으므로, 마지막 result만 사용 (최종 결과)
                      const finalResult = test.results[test.results.length - 1];
                      if (finalResult && finalResult.steps && Array.isArray(finalResult.steps)) {
                        // result.steps[] 배열의 최상위 레벨 step들을 개별 테스트로 처리
                        await processResultSteps(finalResult, suiteItem.id);
                      }
                    }
                  }
                }
              }
            }

            // Suite 종료
            await client.finishTestItem(suiteItem.id, {
              status: 'PASSED'
            });
          }
        } else if (suite.specs && Array.isArray(suite.specs)) {
          // 직접 specs가 있는 경우
          for (const spec of suite.specs) {
            if (spec.tests && Array.isArray(spec.tests)) {
              for (const test of spec.tests) {
                if (test.results && Array.isArray(test.results)) {
                  const finalResult = test.results[test.results.length - 1];
                  if (finalResult && finalResult.steps && Array.isArray(finalResult.steps)) {
                    await processResultSteps(finalResult, null);
                  }
                }
              }
            }
          }
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


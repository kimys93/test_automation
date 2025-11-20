// @ts-check
/**
 * Playwright results.json을 파싱하여 PostgreSQL DB에 저장하는 스크립트
 * test_runs와 test_cases 테이블에 영구적으로 저장
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

// ES 모듈에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config();

/**
 * results.json을 파싱하여 DB에 저장
 */
async function saveResultsToDB() {
  const resultsJsonPath = path.join(__dirname, '..', 'test-results', 'results.json');
  
  if (!fs.existsSync(resultsJsonPath)) {
    console.error(`❌ results.json 파일을 찾을 수 없습니다: ${resultsJsonPath}`);
    process.exit(1);
  }

  // results.json 읽기
  const resultsJson = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));
  
  if (!resultsJson || !resultsJson.stats) {
    console.error('❌ results.json 구조가 올바르지 않습니다. results.stats가 없습니다.');
    process.exit(1);
  }

  // DB 연결 설정
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 10초로 증가
  };
  
  console.log(`🔌 DB 연결 정보: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (user: ${dbConfig.user})`);
  
  const pool = new Pool(dbConfig);

  try {
    // DB 연결 테스트 (재시도 로직 포함)
    let connected = false;
    let retries = 3;
    let lastError = null;
    
    while (retries > 0 && !connected) {
      try {
        const testResult = await pool.query('SELECT version(), current_database(), inet_server_addr(), inet_server_port()');
        console.log('✅ DB 연결 성공');
        console.log(`📊 연결된 DB 정보:`, {
          version: testResult.rows[0].version.split(',')[0],
          database: testResult.rows[0].current_database,
          server_addr: testResult.rows[0].inet_server_addr,
          server_port: testResult.rows[0].inet_server_port
        });
        connected = true;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⚠️ DB 연결 실패, ${retries}번 더 시도합니다... (${error.message})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
        }
      }
    }
    
    if (!connected) {
      throw new Error(`DB 연결 실패: ${lastError?.message || 'Unknown error'}`);
    }

    // 실행 정보 계산
    const stats = resultsJson.stats;
    const startTime = stats.startTime ? new Date(stats.startTime) : new Date();
    const durationMs = Math.round(stats.duration || 0);
    const endTime = new Date(startTime.getTime() + durationMs);

    // 테스트 통계 계산 (depth2 step 기준)
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    const processedStepTitles = new Set();

    if (resultsJson.suites && Array.isArray(resultsJson.suites)) {
      resultsJson.suites.forEach(suite => {
        if (suite.specs && Array.isArray(suite.specs)) {
          suite.specs.forEach(spec => {
            if (spec.tests && Array.isArray(spec.tests)) {
              spec.tests.forEach(test => {
                if (test.results && Array.isArray(test.results)) {
                  const finalResult = test.results[test.results.length - 1];
                  if (finalResult && finalResult.steps && Array.isArray(finalResult.steps)) {
                    const resultStatus = finalResult.status || 'unknown';
                    
                    finalResult.steps.forEach(depth2Step => {
                      const stepTitle = depth2Step.title || '';
                      
                      // 중복 방지
                      if (stepTitle && processedStepTitles.has(stepTitle)) {
                        return;
                      }
                      
                      totalTests++;
                      processedStepTitles.add(stepTitle);
                      
                      // depth2 step에 error가 있는지 확인
                      let depth2StepHasError = false;
                      
                      if (depth2Step.error != null) {
                        depth2StepHasError = true;
                      }
                      
                      // depth3까지 확인
                      if (!depth2StepHasError && depth2Step.steps && Array.isArray(depth2Step.steps)) {
                        for (const depth3Step of depth2Step.steps) {
                          if (depth3Step.error != null) {
                            depth2StepHasError = true;
                            break;
                          }
                          if (depth3Step.steps && Array.isArray(depth3Step.steps)) {
                            for (const depth4Step of depth3Step.steps) {
                              if (depth4Step.error != null) {
                                depth2StepHasError = true;
                                break;
                              }
                            }
                            if (depth2StepHasError) break;
                          }
                        }
                      }
                      
                      // 상태에 따라 카운트
                      if (resultStatus === 'passed') {
                        passedTests++;
                      } else if (resultStatus === 'failed' || resultStatus === 'timedout' || resultStatus === 'interrupted') {
                        if (depth2StepHasError) {
                          failedTests++;
                        } else {
                          passedTests++;
                        }
                      } else if (resultStatus === 'skipped') {
                        skippedTests++;
                      } else {
                        if (depth2StepHasError) {
                          failedTests++;
                        } else {
                          passedTests++;
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    // 환경 변수에서 빌드 정보 가져오기
    const buildNumber = process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local';
    const gitCommit = process.env.GIT_COMMIT || process.env.GIT_COMMIT_SHORT || 'local';
    const testType = process.env.TEST_TYPE || 'sanity';

    // test_runs 테이블에 저장
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const status = failedTests > 0 ? 'FAILED' : (skippedTests > 0 ? 'SKIPPED' : 'PASSED');

    const insertRunQuery = `
      INSERT INTO test_runs (
        run_id, test_type, environment, browser, started_at, finished_at, 
        status, total_tests, passed_tests, failed_tests, skipped_tests, 
        duration_ms, build_number, commit_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id;
    `;

    const runResult = await pool.query(insertRunQuery, [
      runId,
      testType,
      'CI',
      'chromium',
      startTime.toISOString(),
      endTime.toISOString(),
      status,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      durationMs,
      buildNumber,
      gitCommit
    ]);

    const testRunId = runResult.rows[0].id;
    console.log(`✅ test_runs 저장 완료 (id: ${testRunId}, run_id: ${runId})`);
    
    // 실제로 저장되었는지 확인
    const verifyResult = await pool.query('SELECT id, run_id FROM test_runs WHERE id = $1', [testRunId]);
    if (verifyResult.rows.length > 0) {
      console.log(`✅ 저장 확인됨: ${JSON.stringify(verifyResult.rows[0])}`);
    } else {
      console.error(`❌ 저장 확인 실패: id ${testRunId}를 찾을 수 없습니다!`);
    }

    // test_cases 테이블에 저장
    const testCases = [];
    
    if (resultsJson.suites && Array.isArray(resultsJson.suites)) {
      resultsJson.suites.forEach(suite => {
        if (suite.specs && Array.isArray(suite.specs)) {
          suite.specs.forEach(spec => {
            if (spec.tests && Array.isArray(spec.tests)) {
              spec.tests.forEach(test => {
                if (test.results && Array.isArray(test.results)) {
                  const finalResult = test.results[test.results.length - 1];
                  if (finalResult) {
                    const status = finalResult.status ? finalResult.status.toUpperCase() : 'UNKNOWN';
                    
                    let testStartTime, testEndTime;
                    if (finalResult.startTime) {
                      testStartTime = new Date(finalResult.startTime);
                      if (isNaN(testStartTime.getTime())) {
                        testStartTime = new Date();
                      }
                      const testDuration = finalResult.duration || 0;
                      testEndTime = new Date(testStartTime.getTime() + testDuration);
                    } else {
                      const now = new Date();
                      testStartTime = now;
                      testEndTime = now;
                    }
                    
                    testCases.push({
                      test_run_id: testRunId,
                      suite_name: suite.title || 'Unknown Suite',
                      test_name: test.title || 'Unknown Test',
                      status: status,
                      duration_ms: Math.round(finalResult.duration || 0),
                      error_message: finalResult.error?.message || null,
                      stack_trace: finalResult.error?.stack || null,
                      start_time: testStartTime.toISOString(),
                      end_time: testEndTime.toISOString(),
                      severity: null,
                      owner: null,
                      tags: [],
                      attachments: null
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    // test_cases 일괄 저장
    if (testCases.length > 0) {
      const insertCaseQuery = `
        INSERT INTO test_cases (
          test_run_id, suite_name, test_name, test_full_name, status, duration_ms,
          error_message, error_stack, attachments, steps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `;

      for (const testCase of testCases) {
        await pool.query(insertCaseQuery, [
          testCase.test_run_id,
          testCase.suite_name,
          testCase.test_name,
          testCase.test_name, // test_full_name
          testCase.status,
          testCase.duration_ms,
          testCase.error_message,
          testCase.stack_trace,
          testCase.attachments ? JSON.stringify(testCase.attachments) : null,
          null // steps
        ]);
      }
      
      console.log(`✅ test_cases 저장 완료 (${testCases.length}개)`);
    }

    console.log(`\n📊 저장된 테스트 통계:`);
    console.log(`   총 테스트: ${totalTests}`);
    console.log(`   통과: ${passedTests}`);
    console.log(`   실패: ${failedTests}`);
    console.log(`   스킵: ${skippedTests}`);

  } catch (error) {
    console.error('❌ DB 저장 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 스크립트 실행
saveResultsToDB();


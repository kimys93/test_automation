// @ts-check
/**
 * Allure Results를 파싱하여 PostgreSQL DB에 저장하는 스크립트
 * 테스트 히스토리를 지속적으로 저장하여 트렌드 분석 가능
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
 * Allure Results를 DB에 저장
 */
async function saveAllureToDB() {
  const allureResultsPath = path.join(__dirname, '..', 'allure-results');
  
  if (!fs.existsSync(allureResultsPath)) {
    console.error(`❌ allure-results 폴더를 찾을 수 없습니다: ${allureResultsPath}`);
    process.exit(1);
  }

  // DB 연결 설정
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'test_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    // DB 연결 테스트
    await pool.query('SELECT NOW()');
    console.log('✅ DB 연결 성공');

    // Allure Results 파일 읽기
    const files = fs.readdirSync(allureResultsPath);
    const resultFiles = files.filter(f => f.endsWith('-result.json'));
    
    if (resultFiles.length === 0) {
      console.log('⚠️ Allure Results 파일이 없습니다.');
      return;
    }

    console.log(`📊 ${resultFiles.length}개의 테스트 결과 파일 발견`);

    // 실행 정보 생성
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testType = process.env.TEST_TYPE || 'sanity';
    const environment = process.env.CI ? 'CI' : 'local';
    const browser = 'chromium'; // 기본값
    const startedAt = new Date();

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;

    const testCases = [];

    // 각 결과 파일 파싱
    for (const file of resultFiles) {
      const filePath = path.join(allureResultsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = JSON.parse(content);

      const status = result.status === 'passed' ? 'PASSED' :
                     result.status === 'failed' ? 'FAILED' :
                     result.status === 'skipped' ? 'SKIPPED' : 'BROKEN';

      totalTests++;
      if (status === 'PASSED') passedTests++;
      else if (status === 'FAILED') failedTests++;
      else if (status === 'SKIPPED') skippedTests++;

      const duration = result.time?.duration || 0;
      totalDuration += duration;

      // 에러 정보 추출
      let errorMessage = null;
      let errorStack = null;
      if (result.statusDetails) {
        errorMessage = result.statusDetails.message || null;
        errorStack = result.statusDetails.trace || null;
      }

      // 첨부파일 정보 추출
      const attachments = (result.attachments || []).map(att => ({
        name: att.name,
        type: att.type,
        source: att.source
      }));

      // 단계 정보 추출
      const steps = (result.steps || []).map(step => ({
        name: step.name,
        status: step.status,
        duration: step.time?.duration || 0,
        attachments: (step.attachments || []).map(att => ({
          name: att.name,
          type: att.type,
          source: att.source
        }))
      }));

      testCases.push({
        testName: result.name || 'Unknown Test',
        testFullName: result.fullName || result.name || 'Unknown Test',
        suiteName: result.labels?.find(l => l.name === 'suite')?.value || 
                   result.labels?.find(l => l.name === 'package')?.value || 
                   null,
        status,
        durationMs: Math.round(duration),
        errorMessage,
        errorStack,
        attachments: attachments.length > 0 ? attachments : null,
        steps: steps.length > 0 ? steps : null
      });
    }

    const finishedAt = new Date();
    const finalStatus = failedTests > 0 ? 'FAILED' : 
                       skippedTests > 0 ? 'SKIPPED' : 'PASSED';

    // 트랜잭션 시작
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 테스트 실행 정보 저장
      const runResult = await client.query(
        `INSERT INTO test_runs (
          run_id, test_type, environment, browser, started_at, finished_at,
          status, total_tests, passed_tests, failed_tests, skipped_tests,
          duration_ms, build_number, commit_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          runId, testType, environment, browser, startedAt, finishedAt,
          finalStatus, totalTests, passedTests, failedTests, skippedTests,
          Math.round(totalDuration), process.env.BUILD_NUMBER || null,
          process.env.GIT_COMMIT || null
        ]
      );

      const testRunId = runResult.rows[0].id;

      // 테스트 케이스 저장
      for (const testCase of testCases) {
        await client.query(
          `INSERT INTO test_cases (
            test_run_id, test_name, test_full_name, suite_name, status,
            duration_ms, error_message, error_stack, attachments, steps
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            testRunId, testCase.testName, testCase.testFullName,
            testCase.suiteName, testCase.status, testCase.durationMs,
            testCase.errorMessage, testCase.errorStack,
            testCase.attachments ? JSON.stringify(testCase.attachments) : null,
            testCase.steps ? JSON.stringify(testCase.steps) : null
          ]
        );
      }

      await client.query('COMMIT');

      console.log('\n📊 DB 저장 완료!');
      console.log(`   Run ID: ${runId}`);
      console.log(`   총 테스트: ${totalTests}`);
      console.log(`   통과: ${passedTests}`);
      console.log(`   실패: ${failedTests}`);
      console.log(`   스킵: ${skippedTests}`);
      console.log(`\n✅ 테스트 히스토리가 DB에 저장되었습니다.`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ DB 저장 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 스크립트 실행
saveAllureToDB().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});


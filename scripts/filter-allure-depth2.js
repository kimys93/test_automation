// @ts-check
/**
 * Allure 결과 파일에서 depth2만 남기고 depth3 이상을 제거하는 스크립트
 * Slack 메시지와 동일한 depth2 기준으로 Allure 리포트를 생성
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * steps 배열에서 depth2만 남기고 depth3 이상 제거
 */
function filterStepsToDepth2(steps) {
  if (!Array.isArray(steps)) {
    return steps;
  }

  return steps.map(step => {
    // depth2 step은 유지하되, 하위 steps는 제거
    const filteredStep = {
      ...step,
      steps: [] // depth3 이상 제거
    };
    return filteredStep;
  });
}

/**
 * Allure 결과 파일 처리
 */
function processAllureResult(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = JSON.parse(content);

    // steps 배열에서 depth2만 남기기
    if (result.steps && Array.isArray(result.steps)) {
      result.steps = filterStepsToDepth2(result.steps);
    }

    // 수정된 내용을 파일에 저장
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`❌ 파일 처리 중 오류 발생: ${filePath}`, error.message);
    return false;
  }
}

/**
 * allure-results 디렉토리의 모든 결과 파일 처리
 */
async function filterAllureResults() {
  const allureResultsPath = path.join(__dirname, '..', 'allure-results');

  if (!fs.existsSync(allureResultsPath)) {
    console.error(`❌ allure-results 디렉토리를 찾을 수 없습니다: ${allureResultsPath}`);
    process.exit(1);
  }

  // 모든 result.json 파일 찾기
  const files = fs.readdirSync(allureResultsPath);
  const resultFiles = files.filter(f => f.endsWith('-result.json'));

  if (resultFiles.length === 0) {
    console.log('⚠️ Allure Results 파일이 없습니다.');
    return;
  }

  console.log(`📊 ${resultFiles.length}개의 Allure 결과 파일 발견`);
  console.log('🔍 depth2만 남기고 depth3 이상 제거 중...');

  let processedCount = 0;
  for (const file of resultFiles) {
    const filePath = path.join(allureResultsPath, file);
    if (processAllureResult(filePath)) {
      processedCount++;
    }
  }

  console.log(`✅ ${processedCount}개의 파일 처리 완료`);
  console.log('📝 이제 allure generate를 실행하면 depth2만 표시됩니다.');
}

// 스크립트 실행
filterAllureResults().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});


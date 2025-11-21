// @ts-check
/**
 * Allure 결과 파일을 depth2 기준으로 변환하는 스크립트
 * depth2 step을 개별 테스트 케이스로 분리하여 카운팅을 depth2 기준으로 함
 * depth3 이상의 상세 단계는 각 depth2 step의 하위 단계로 유지
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * depth2 step을 개별 테스트 케이스로 변환
 */
function convertDepth2ToTestCases(result) {
  if (!result.steps || !Array.isArray(result.steps)) {
    return [result]; // steps가 없으면 원본 그대로 반환
  }

  const testCases = [];
  const baseTestName = result.name || 'Unknown Test';
  const baseFullName = result.fullName || result.name || 'Unknown Test';

  // Before Hooks나 기타 depth1 step은 제외하고 depth2만 추출
  // depth2는 보통 "홈페이지 접속 및 기본 로드 확인" 같은 메인 기능 단계
  const depth2Steps = result.steps.filter(step => {
    // Before Hooks, After Hooks 등은 제외
    const stepName = step.name || '';
    return !stepName.includes('Before Hooks') && 
           !stepName.includes('After Hooks') &&
           !stepName.includes('Fixture');
  });

  if (depth2Steps.length === 0) {
    return [result]; // depth2 step이 없으면 원본 그대로 반환
  }

  // 각 depth2 step을 개별 테스트 케이스로 변환
  depth2Steps.forEach((depth2Step, index) => {
    const testCase = {
      uuid: crypto.randomUUID(),
      historyId: `${result.historyId || crypto.randomUUID()}-${index}`,
      fullName: `${baseFullName} > ${depth2Step.name}`,
      name: depth2Step.name || `Step ${index + 1}`,
      status: depth2Step.status || result.status || 'passed',
      statusDetails: depth2Step.statusDetails || result.statusDetails || {},
      stage: depth2Step.stage || result.stage || 'finished',
      description: depth2Step.description || result.description || '',
      descriptionHtml: depth2Step.descriptionHtml || result.descriptionHtml || '',
      steps: depth2Step.steps || [], // depth3 이상의 상세 단계는 유지
      attachments: depth2Step.attachments || result.attachments || [],
      parameters: depth2Step.parameters || result.parameters || [],
      labels: [
        ...(result.labels || []),
        { name: 'testType', value: result.labels?.find(l => l.name === 'testType')?.value || 'sanity' }
      ],
      links: result.links || [],
      time: depth2Step.time || result.time || {},
      // 원본 테스트 정보 유지
      parent: result.parent || null
    };

    testCases.push(testCase);
  });

  return testCases;
}

/**
 * Allure 결과 파일 처리
 */
function processAllureResult(filePath, outputDir) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = JSON.parse(content);

    // depth2 step을 개별 테스트 케이스로 변환
    const testCases = convertDepth2ToTestCases(result);

    // 원본 파일 삭제
    fs.unlinkSync(filePath);

    // 각 테스트 케이스를 개별 파일로 저장
    testCases.forEach((testCase, index) => {
      const newFileName = `${testCase.uuid}-result.json`;
      const newFilePath = path.join(outputDir, newFileName);
      fs.writeFileSync(newFilePath, JSON.stringify(testCase, null, 2), 'utf-8');
    });

    return testCases.length;
  } catch (error) {
    console.error(`❌ 파일 처리 중 오류 발생: ${filePath}`, error.message);
    return 0;
  }
}

/**
 * allure-results 디렉토리의 모든 결과 파일 처리
 */
async function convertAllureResults() {
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
  console.log('🔄 depth2 step을 개별 테스트 케이스로 변환 중...');

  let totalConverted = 0;
  for (const file of resultFiles) {
    const filePath = path.join(allureResultsPath, file);
    const convertedCount = processAllureResult(filePath, allureResultsPath);
    totalConverted += convertedCount;
  }

  console.log(`✅ 변환 완료: ${resultFiles.length}개 파일 → ${totalConverted}개 테스트 케이스`);
  console.log('📝 이제 allure generate를 실행하면 depth2 기준으로 카운팅됩니다.');
}

// 스크립트 실행
convertAllureResults().catch(error => {
  console.error('❌ 오류:', error);
  process.exit(1);
});


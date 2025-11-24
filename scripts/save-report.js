// @ts-check
/**
 * Playwright HTML 리포트를 에러 발생 시 특정 이름으로 저장하는 스크립트
 * 리포트를 reports/{timestamp}_{test_type}_{status}.html 형식으로 저장
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - dotenv 타입 선언이 없어도 정상 동작
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config();

// reports 디렉토리 경로 (전역 변수로 정의)
const reportsDir = path.join(__dirname, '..', 'reports');

/**
 * Playwright 리포트를 저장
 * @param {string} testType - 테스트 타입 (sanity, regression 등)
 * @param {string} status - 테스트 상태 (PASSED, FAILED 등)
 * @param {string} runId - 실행 ID
 * @returns {string|null} 저장된 리포트 경로 또는 null
 */
function saveReport(testType, status, runId) {
  const playwrightReportDir = path.join(__dirname, '..', 'playwright-report');
  const sourceIndexHtml = path.join(playwrightReportDir, 'index.html');
  
  // 리포트가 없으면 null 반환
  if (!fs.existsSync(sourceIndexHtml)) {
    console.log('⚠️ Playwright 리포트 파일을 찾을 수 없습니다:', sourceIndexHtml);
    return null;
  }

  // reports 디렉토리 생성
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // 타임스탬프 생성 (YYYYMMDD_HHMMSS 형식)
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '')
    .replace(/\..+/, '')
    .substring(0, 15); // YYYYMMDD_HHMMSS

  // 리포트 디렉토리명 생성: report_{timestamp}_{testType}_{status}_{runId}
  const reportDirName = `report_${timestamp}_${testType}_${status}_${runId.substring(0, 8)}`;
  const destReportDir = path.join(reportsDir, reportDirName);
  
  // index.html 파일명
  const fileName = `index_${timestamp}_${testType}_${status}_${runId.substring(0, 8)}.html`;
  const destIndexPath = path.join(destReportDir, fileName);

  try {
    // 리포트 디렉토리 전체를 복사 (assets 포함)
    copyDirectory(playwrightReportDir, destReportDir);
    
    // 기존 index.html을 새 이름으로 복사
    const originalIndexPath = path.join(destReportDir, 'index.html');
    if (fs.existsSync(originalIndexPath)) {
      fs.copyFileSync(originalIndexPath, destIndexPath);
    }
    
    // 상대 경로 반환 (DB 저장용) - index.html 경로
    const relativePath = path.relative(path.join(__dirname, '..'), destIndexPath).replace(/\\/g, '/');
    console.log(`✅ 리포트 저장 완료: ${relativePath}`);
    
    return relativePath;
  } catch (error) {
    console.error('❌ 리포트 저장 중 오류 발생:', error);
    return null;
  }
}

/**
 * 디렉토리 복사 (재귀적)
 * @param {string} src - 소스 디렉토리
 * @param {string} dest - 대상 디렉토리
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 스크립트 실행
const testType = process.env.TEST_TYPE || 'sanity';
const status = process.env.TEST_STATUS || 'PASSED';
const runId = process.env.RUN_ID || `run-${Date.now()}`;

const reportPath = saveReport(testType, status, runId);

  // 리포트 경로를 파일로 저장 (Jenkinsfile에서 읽기 위해)
  if (reportPath) {
    const reportPathFile = path.join(reportsDir, '.last-report-path');
    fs.writeFileSync(reportPathFile, reportPath, 'utf-8');
    process.env.REPORT_PATH = reportPath;
    console.log(`📄 리포트 경로: ${reportPath}`);
  } else {
    console.log('⚠️ 리포트를 저장하지 않았습니다.');
  }

export { saveReport };


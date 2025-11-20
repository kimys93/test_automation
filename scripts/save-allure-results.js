// @ts-check
/**
 * Allure 결과 파일을 영구 저장소에 보관하는 스크립트
 * 히스토리 기능을 통해 트렌드 분석 가능
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Allure 결과를 영구 저장소에 복사
 */
async function saveAllureResults() {
  const sourceDir = path.join(__dirname, '..', 'allure-results');
  const permanentDir = process.env.ALLURE_RESULTS_PERMANENT || path.join(__dirname, '..', 'allure-results-permanent');
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ allure-results 디렉토리를 찾을 수 없습니다: ${sourceDir}`);
    process.exit(1);
  }

  // 영구 저장소 디렉토리 생성
  if (!fs.existsSync(permanentDir)) {
    fs.mkdirSync(permanentDir, { recursive: true });
    console.log(`✅ 영구 저장소 디렉토리 생성: ${permanentDir}`);
  }

  // allure-results의 모든 파일을 영구 저장소로 복사
  const files = fs.readdirSync(sourceDir);
  let copiedCount = 0;

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(permanentDir, file);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isFile()) {
      // 파일이 이미 존재하면 타임스탬프를 추가하여 중복 방지
      if (fs.existsSync(destPath)) {
        const timestamp = Date.now();
        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const newFileName = `${name}-${timestamp}${ext}`;
        const newDestPath = path.join(permanentDir, newFileName);
        fs.copyFileSync(sourcePath, newDestPath);
        console.log(`📄 복사: ${file} -> ${newFileName}`);
      } else {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`📄 복사: ${file}`);
      }
      copiedCount++;
    } else if (stat.isDirectory()) {
      // 디렉토리는 재귀적으로 복사
      const destDir = path.join(permanentDir, file);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      copyDirectory(sourcePath, destDir);
      copiedCount++;
    }
  }

  console.log(`✅ Allure 결과 파일 ${copiedCount}개를 영구 저장소에 저장했습니다.`);
  console.log(`📁 영구 저장소 위치: ${permanentDir}`);
}

/**
 * 디렉토리 재귀 복사
 */
function copyDirectory(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(sourcePath);

    if (stat.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
    } else if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    }
  }
}

// 스크립트 실행
saveAllureResults();


#!/usr/bin/env node
/**
 * Allure 리포트를 ReportPortal Launch에 첨부하는 스크립트
 * 
 * 사용법:
 *   node scripts/attach-allure-to-reportportal.js <launchName> <allureReportPath>
 * 
 * 예시:
 *   node scripts/attach-allure-to-reportportal.js sanity allure-report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 확인
const RP_ENDPOINT = process.env.RP_ENDPOINT || 'http://localhost:8082/api/v1';
const RP_TOKEN = process.env.RP_TOKEN;
const RP_PROJECT = process.env.RP_PROJECT || 'test_automation';

if (!RP_TOKEN) {
  console.error('❌ RP_TOKEN 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// 명령줄 인자 확인
const launchName = process.argv[2];
const allureReportPath = process.argv[3] || 'allure-report';

if (!launchName) {
  console.error('❌ Launch 이름이 제공되지 않았습니다.');
  console.error('사용법: node scripts/attach-allure-to-reportportal.js <launchName> [allureReportPath]');
  process.exit(1);
}

// Allure 리포트 경로 확인
const fullAllurePath = path.resolve(process.cwd(), allureReportPath);
if (!fs.existsSync(fullAllurePath)) {
  console.error(`❌ Allure 리포트 경로를 찾을 수 없습니다: ${fullAllurePath}`);
  process.exit(1);
}

console.log(`📦 Allure 리포트를 ReportPortal에 첨부합니다...`);
console.log(`   Launch: ${launchName}`);
console.log(`   리포트 경로: ${fullAllurePath}`);
console.log(`   ReportPortal: ${RP_ENDPOINT}`);

async function findLaunchId(launchName) {
  try {
    // ReportPortal API로 최근 launch 조회
    // API 엔드포인트: GET /{project}/launch?filter.eq.name={name}&page.size=1&page.sort=startTime,desc
    const url = `${RP_ENDPOINT}/${RP_PROJECT}/launch?filter.eq.name=${encodeURIComponent(launchName)}&page.size=1&page.sort=startTime,desc`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.content && data.content.length > 0) {
      // 가장 최근 launch 반환
      const latestLaunch = data.content[0];
      console.log(`✅ Launch ID 찾음: ${latestLaunch.id} (${latestLaunch.name})`);
      return latestLaunch.id;
    } else {
      throw new Error(`Launch "${launchName}"을 찾을 수 없습니다.`);
    }
  } catch (error) {
    console.error(`❌ Launch 조회 실패: ${error.message}`);
    throw error;
  }
}


async function findFirstTestItem(launchId) {
  try {
    // Launch의 첫 번째 test item 조회
    const url = `${RP_ENDPOINT}/${RP_PROJECT}/item?filter.eq.launchId=${launchId}&page.size=1&page.sort=startTime,asc`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.content && data.content.length > 0) {
      const firstItem = data.content[0];
      console.log(`✅ Test Item 찾음: ${firstItem.id} (${firstItem.name})`);
      return firstItem.id;
    } else {
      throw new Error('Test Item을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error(`❌ Test Item 조회 실패: ${error.message}`);
    throw error;
  }
}

async function attachFileToLaunch(launchId, filePath, fileName) {
  try {
    // ReportPortal v5 API: 파일 첨부는 multipart/form-data로 로그 엔드포인트를 통해 이루어짐
    // 필수 필드: json_request_part (JSON 문자열)와 file (실제 파일)
    const itemId = await findFirstTestItem(launchId);
    
    // Node.js에서 multipart/form-data 생성
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // ReportPortal log API에 필요한 JSON 메타데이터
    const jsonRequestPart = JSON.stringify({
      itemUuid: itemId.toString(),
      launchUuid: launchId.toString(),
      level: 'INFO',
      message: `Allure Report: ${fileName}`,
      time: new Date().toISOString()
    });
    
    // 필수 필드: json_request_part (JSON 문자열)
    // Gemini 해결책: filename 없이 일반 텍스트 파트로 추가
    // ReportPortal은 이 파트를 파일이 아닌 메타데이터로 인식해야 함
    formData.append('json_request_part', jsonRequestPart);
    
    // 필수 필드: file (실제 파일) - 파일 스트림과 파일 이름을 전달하여 파일 파트로 구성
    formData.append('file', fs.createReadStream(filePath), fileName);
    
    // 디버깅: 전송할 데이터 확인
    console.log(`   JSON Request Part: ${jsonRequestPart.substring(0, 100)}...`);
    
    // ReportPortal API: POST /{project}/log (multipart/form-data)
    // Gemini 해결책: fetch 대신 http/https 모듈 사용하여 form-data를 직접 pipe
    const urlObject = new URL(`${RP_ENDPOINT}/${RP_PROJECT}/log`);
    const protocol = urlObject.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      method: 'POST',
      host: urlObject.hostname,
      port: urlObject.port || (protocol === https ? 443 : 80),
      path: urlObject.pathname + urlObject.search,
      headers: {
        'Authorization': `Bearer ${RP_TOKEN}`,
        ...formData.getHeaders() // Content-Type 헤더가 포함됨
      }
    };

    console.log(`📤 파일 업로드 중: ${fileName} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Target Launch ID: ${launchId}`);
    console.log(`   Target Item ID: ${itemId}`);
    console.log(`   API Endpoint: ${urlObject.href}`);
    
    // Promise로 래핑하여 응답 처리
    return new Promise((resolve, reject) => {
      const req = protocol.request(requestOptions, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk.toString();
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ 파일 첨부 완료: ${fileName}`);
            try {
              const result = responseBody ? JSON.parse(responseBody) : { message: 'Success (no JSON body)' };
              resolve(result);
            } catch (e) {
              resolve({ message: 'Success (invalid JSON response)' });
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`요청 오류: ${err.message}`));
      });
      
      // formData 스트림을 요청에 파이프합니다 (핵심!)
      formData.pipe(req);
    });
  } catch (error) {
    console.error(`❌ 파일 첨부 실패: ${error.message}`);
    throw error;
  }
}

async function createZipArchive(sourceDir, outputPath) {
  try {
    // Node.js에서 zip 생성 (adm-zip 또는 다른 라이브러리 사용)
    // 간단하게 tar + gzip 사용 (Unix/Linux/Mac)
    // Windows에서는 PowerShell 사용
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: PowerShell Compress-Archive 사용
      const psCommand = `Compress-Archive -Path "${sourceDir}\\*" -DestinationPath "${outputPath}" -Force`;
      execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    } else {
      // Unix/Linux/Mac: tar 사용
      execSync(`tar -czf "${outputPath}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`, { stdio: 'inherit' });
    }
    
    console.log(`✅ ZIP 파일 생성 완료: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ ZIP 파일 생성 실패: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // 1. Launch ID 조회
    const launchId = await findLaunchId(launchName);
    
    // 2. Allure 리포트를 ZIP으로 압축
    const zipPath = path.join(process.cwd(), 'allure-report.zip');
    await createZipArchive(fullAllurePath, zipPath);
    
    // 3. ZIP 파일을 ReportPortal에 첨부
    await attachFileToLaunch(launchId, zipPath, 'allure-report.zip');
    
    // 4. 임시 ZIP 파일 삭제
    fs.unlinkSync(zipPath);
    
    console.log(`\n✅ 완료! Allure 리포트가 ReportPortal Launch에 첨부되었습니다.`);
    console.log(`   Launch ID: ${launchId}`);
    console.log(`   리포트: ${RP_ENDPOINT.replace('/api/v1', '/ui')}/#${RP_PROJECT}/launches/all/${launchId}`);
  } catch (error) {
    console.error(`\n❌ 오류 발생: ${error.message}`);
    process.exit(1);
  }
}

main();


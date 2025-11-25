#!/usr/bin/env node
/**
 * ReportPortal Launch ID 또는 Item ID를 조회하는 보조 스크립트
 * 
 * 사용법:
 *   node scripts/get-rp-id.js launch <launchName>  // Launch ID 반환
 *   node scripts/get-rp-id.js item <launchId>      // Item ID 반환
 */

// 환경 변수 확인
const RP_ENDPOINT = process.env.RP_ENDPOINT || 'http://localhost:8082/api/v1';
const RP_TOKEN = process.env.RP_TOKEN;
const RP_PROJECT = process.env.RP_PROJECT || 'test_automation';

if (!RP_TOKEN) {
  console.error('❌ RP_TOKEN 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const type = process.argv[2]; // 'launch' or 'item'
const identifier = process.argv[3]; // launchName or launchId

if (!type || !identifier) {
  console.error('사용법: node get-rp-id.js [launch|item] [launchName|launchId]');
  process.exit(1);
}

async function findLaunchId(launchName) {
  try {
    const url = `${RP_ENDPOINT}/${RP_PROJECT}/launch?filter.eq.name=${encodeURIComponent(launchName)}&page.size=1&page.sort=startTime,desc`;
    const response = await fetch(url, {
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
      return data.content[0].id.toString();
    } else {
      throw new Error(`Launch "${launchName}"을 찾을 수 없습니다.`);
    }
  } catch (error) {
    console.error(`❌ Launch 조회 실패: ${error.message}`);
    process.exit(1);
  }
}

async function findFirstTestItem(launchId) {
  try {
    const url = `${RP_ENDPOINT}/${RP_PROJECT}/item?filter.eq.launchId=${launchId}&page.size=1&page.sort=startTime,asc`;
    const response = await fetch(url, {
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
      return data.content[0].id.toString();
    } else {
      throw new Error('Test Item을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error(`❌ Test Item 조회 실패: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  let id;
  
  if (type === 'launch') {
    id = await findLaunchId(identifier);
  } else if (type === 'item') {
    id = await findFirstTestItem(identifier);
  } else {
    console.error('사용법: node get-rp-id.js [launch|item] [launchName|launchId]');
    process.exit(1);
  }
  
  // ID만 표준 출력으로 내보냅니다 (Jenkins에서 캡처용)
  console.log(id);
}

main();


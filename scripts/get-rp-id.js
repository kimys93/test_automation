#!/usr/bin/env node
/**
 * ReportPortal Launch ID 또는 Item ID를 조회하고, Launch 상태를 업데이트하는 보조 스크립트
 * 
 * 사용법:
 *   node scripts/get-rp-id.js launch <launchName>        // Launch ID 반환
 *   node scripts/get-rp-id.js item <launchId>            // Item ID 반환
 *   node scripts/get-rp-id.js update <launchId> <status> // Launch 상태 업데이트 (ACTIVE/STOPPED)
 * 
 * 주의: 이 스크립트는 stdout에 순수한 JSON 문자열만 출력합니다.
 * 디버그 메시지는 stderr로 출력되므로 Jenkins의 returnStdout 캡처에 포함되지 않습니다.
 */

// Node.js 경고 억제 (환경 변수로도 제어 가능)
process.removeAllListeners('warning');

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
      // Launch ID와 UUID를 모두 반환 (JSON 객체)
      return JSON.stringify({
        id: data.content[0].id.toString(),
        uuid: data.content[0].uuid
      });
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
      // ReportPortal API는 itemUuid를 요구하므로 uuid를 반환
      return data.content[0].uuid;
    } else {
      throw new Error('Test Item을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error(`❌ Test Item 조회 실패: ${error.message}`);
    process.exit(1);
  }
}

async function updateLaunchStatus(launchId, status) {
  try {
    const url = `${RP_ENDPOINT}/${RP_PROJECT}/launch/${launchId}/update`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${RP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status // 'ACTIVE' 또는 'STOPPED'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // 성공 시 아무것도 출력하지 않음 (ID만 출력하는 것이 목적)
  } catch (error) {
    console.error(`❌ Launch 상태 업데이트 실패: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  if (type === 'launch') {
    const result = await findLaunchId(identifier);
    // JSON 문자열만 stdout으로 출력 (stderr는 디버그용)
    console.log(result); // JSON 문자열 출력: {"id":"31","uuid":"abc-123-def"}
    // stderr로 디버그 정보 출력 (Jenkins에서 캡처되지 않음)
    console.error(`DEBUG: Launch 정보 조회 완료: ${identifier}`);
  } else if (type === 'item') {
    const id = await findFirstTestItem(identifier);
    console.log(id);
  } else if (type === 'update') {
    const launchId = identifier;
    const status = process.argv[4]; // 'ACTIVE' or 'STOPPED'
    if (!status || (status !== 'ACTIVE' && status !== 'STOPPED')) {
      console.error('사용법: node get-rp-id.js update <launchId> [ACTIVE|STOPPED]');
      process.exit(1);
    }
    await updateLaunchStatus(launchId, status);
    // update 명령은 출력 없이 성공/실패만 반환
    console.error(`DEBUG: Launch ${launchId} 상태를 ${status}로 변경 완료`);
  } else {
    console.error('사용법: node get-rp-id.js [launch|item|update] [launchName|launchId|launchId] [status]');
    process.exit(1);
  }
}

main();


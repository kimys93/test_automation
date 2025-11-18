# n8n 간단한 워크플로우 가이드

테스트 실행 → result.json DB 저장 → Allure에서 누적치 표시

## 목표

1. 테스트 수행
2. `test-results/results.json`을 DB에 저장
3. 영구적으로 저장된 DB를 토대로 Allure에서 테스트 결과 누적치 표시

## 워크플로우 구조

```
[GitHub Webhook] ──┐
                    ├──→ [IF 조건] ──→ [Execute Command: npm run test:sanity]
[Manual Webhook] ───┘
                                              ↓
                                    [Code: result.json 파싱]
                                    (testRun + testCases 배열 반환)
                                              ↓
                                    [PostgreSQL: test_runs 저장]
                                    (run_id 반환)
                                              ↓
                                    [Code: run_id를 testCases에 추가]
                                    Mode: Run Once for All Items
                                    (testCases 배열 + run_id 결합)
                                              ↓
                                    [Split In Batches]
                                    (Batch Size: 1)
                                              ↓
                                    [PostgreSQL: test_cases 저장]
                                    (각 testCase 개별 INSERT)
                                              ↓
                                    [Slack 알림]
```

## 단계별 설정

### 1. Webhook 노드 (GitHub + 수동 실행)

**GitHub Webhook:**
- Path: `github-webhook`
- HTTP Method: `POST`

**Manual Webhook:**
- Path: `manual-test`
- HTTP Method: `POST`

### 2. IF 조건 노드

- 조건 1: `{{ $json.headers['x-github-event'] }}` `exists`
- OR
- 조건 2: `{{ $json.body.trigger }}` `is equal to` `manual`

### 3. Execute Command 노드 (테스트 실행)

- **Command**: `npm run test:sanity` (Expression 모드)
- **Working Directory**: `D:\test_automation`

### 4. Code 노드 (result.json 파싱 및 DB 저장 준비)

**설정:**

```javascript
const fs = require('fs');
const path = require('path');

// result.json 읽기
const resultsPath = path.join('D:\\test_automation', 'test-results', 'results.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// 실행 정보 계산
const startTime = new Date(results.stats.startTime);
const endTime = new Date(results.stats.endTime);
const durationMs = results.stats.duration;

// 웹훅 타입에 따라 데이터 추출
const isGitHubWebhook = $input.item.json.headers && $input.item.json.headers['x-github-event'];
const webhookBody = $input.item.json.body || {};

// GitHub 웹훅인 경우: GitHub 이벤트 데이터에서 추출
// Manual 웹훅인 경우: body에서 직접 가져오기
let buildNumber, gitCommit, testType;

if (isGitHubWebhook) {
  // GitHub 웹훅: GitHub 이벤트 데이터에서 추출
  buildNumber = webhookBody.head_commit?.id?.substring(0, 7) || 'github-' + Date.now();
  gitCommit = webhookBody.head_commit?.id || webhookBody.after || 'unknown';
  testType = 'sanity'; // GitHub 웹훅은 기본값 사용
} else {
  // Manual 웹훅: body에서 직접 가져오기
  buildNumber = webhookBody.build_number || 'local';
  gitCommit = webhookBody.git_commit || 'local';
  testType = webhookBody.test_type || 'sanity';
}

// test_runs 테이블 데이터
const testRunData = {
  build_number: buildNumber,
  git_commit: gitCommit,
  test_type: testType,
  start_time: startTime.toISOString(),
  end_time: endTime.toISOString(),
  duration_ms: durationMs,
  total_tests: results.stats.total,
  passed_tests: results.stats.passed,
  failed_tests: results.stats.failed,
  skipped_tests: results.stats.skipped,
  broken_tests: 0,
  product_bug_tests: 0,
  automation_bug_tests: 0,
  link_to_report: null
};

// test_cases 배열 준비 (타입 명시 - JSDoc 사용)
/** @type {any[]} */
const testCases = [];

if (results.suites && Array.isArray(results.suites)) {
  results.suites.forEach(suite => {
    if (suite.specs && Array.isArray(suite.specs)) {
      suite.specs.forEach(spec => {
        if (spec.tests && Array.isArray(spec.tests)) {
          spec.tests.forEach(test => {
            if (test.results && Array.isArray(test.results)) {
              const finalResult = test.results[test.results.length - 1];
              if (finalResult) {
                testCases.push({
                  suite_name: suite.title || 'Unknown Suite',
                  test_name: test.title || 'Unknown Test',
                  status: finalResult.status || 'unknown',
                  duration_ms: finalResult.duration || 0,
                  error_message: finalResult.error?.message || null,
                  stack_trace: finalResult.error?.stack || null,
                  start_time: new Date(finalResult.startTime).toISOString(),
                  end_time: new Date(finalResult.startTime + finalResult.duration).toISOString(),
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

// n8n 반환 형식: 객체로 반환
return {
  json: {
    testRun: testRunData,
    testCases: testCases,
    // Slack 메시지용 통계
    totalTests: results.stats.total,
    passedTests: results.stats.passed,
    failedTests: results.stats.failed,
    skippedTests: results.stats.skipped,
    testStatus: results.stats.failed > 0 || results.stats.skipped > 0 ? 'Fail' : 'Success'
  }
};
```

### 5. PostgreSQL 노드 (test_runs 저장)

**설정:**

- **Operation**: `Execute Query`
- **Query**:
  ```sql
  INSERT INTO test_runs (build_number, git_commit, test_type, start_time, end_time, duration_ms, total_tests, passed_tests, failed_tests, skipped_tests, broken_tests, product_bug_tests, automation_bug_tests, link_to_report)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING run_id;
  ```
- **Parameters**: Expression 모드(`fx` 버튼)로 각 파라미터 매핑

**복사-붙여넣기용 Parameters:**

```
$1: {{ $json.testRun.build_number }}
$2: {{ $json.testRun.git_commit }}
$3: {{ $json.testRun.test_type }}
$4: {{ $json.testRun.start_time }}
$5: {{ $json.testRun.end_time }}
$6: {{ $json.testRun.duration_ms }}
$7: {{ $json.testRun.total_tests }}
$8: {{ $json.testRun.passed_tests }}
$9: {{ $json.testRun.failed_tests }}
$10: {{ $json.testRun.skipped_tests }}
$11: {{ $json.testRun.broken_tests }}
$12: {{ $json.testRun.product_bug_tests }}
$13: {{ $json.testRun.automation_bug_tests }}
$14: {{ $json.testRun.link_to_report }}
```

**출력:** `{ run_id: 123 }` 형태로 반환됩니다.

### 6. Code 노드 (run_id를 testCases에 추가)

**설정:**

- **Language**: `JavaScript`
- **Mode**: `Run Once for All Items` 선택 (중요!)
- **Code**:
  ```javascript
  // 모든 입력 아이템 가져오기
  const items = $input.all();
  
  // 첫 번째 Code 노드의 출력 찾기 (testCases 포함)
  const firstCodeOutput = items.find(item => item.json && item.json.testCases) || items[0];
  const testCases = firstCodeOutput?.json?.testCases || [];
  
  // PostgreSQL 노드의 출력 찾기 (run_id 포함)
  const postgresOutput = items.find(item => item.json && item.json.run_id);
  const runId = postgresOutput?.json?.run_id;
  
  if (!runId) {
    throw new Error('run_id를 찾을 수 없습니다.');
  }
  
  // 각 testCase에 run_id 추가
  const testCasesWithRunId = testCases.map(testCase => ({
    ...testCase,
    run_id: runId
  }));
  
  // 각 testCase를 개별 아이템으로 반환
  return testCasesWithRunId.map(testCase => ({
    json: testCase
  }));
  ```

**중요:** 
- 이 노드의 **Mode**를 반드시 `Run Once for All Items`로 설정해야 합니다.
- Settings 탭에서 "Run Once for Each Item"을 체크 해제하고 "Run Once for All Items"를 선택하세요.

### 7. Loop Over Items 노드 (또는 Split In Batches 노드)

**방법 1: Loop Over Items 노드 사용**

**설정:**
- **Field to Split Out**: `json` (또는 비워두기 - 기본값)
- **Options**: 기본값 사용

**동작:** Code 노드에서 반환된 testCases 배열의 각 요소를 개별 아이템으로 분리합니다.

**방법 2: Split In Batches 노드 사용**

**설정:**
- **Batch Size**: `1`
- **Options**: 기본값 사용

**동작:** Code 노드에서 반환된 testCases 배열을 각각 개별 아이템으로 분리합니다.

**참고:** 두 방법 모두 동일하게 동작하지만, Loop Over Items가 더 직관적입니다.

### 8. PostgreSQL 노드 (test_cases 저장)

**설정:**

- **Operation**: `Execute Query`
- **Query**:
  ```sql
  INSERT INTO test_runs (build_number, git_commit, test_type, start_time, end_time, duration_ms, total_tests, passed_tests, failed_tests, skipped_tests, broken_tests, product_bug_tests, automation_bug_tests, link_to_report)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING run_id;
  ```
- **Parameters**: Expression 모드(`fx` 버튼)로 각 파라미터 매핑

**복사-붙여넣기용 Parameters:**

```
$1: {{ $json.testRun.build_number }}
$2: {{ $json.testRun.git_commit }}
$3: {{ $json.testRun.test_type }}
$4: {{ $json.testRun.start_time }}
$5: {{ $json.testRun.end_time }}
$6: {{ $json.testRun.duration_ms }}
$7: {{ $json.testRun.total_tests }}
$8: {{ $json.testRun.passed_tests }}
$9: {{ $json.testRun.failed_tests }}
$10: {{ $json.testRun.skipped_tests }}
$11: {{ $json.testRun.broken_tests }}
$12: {{ $json.testRun.product_bug_tests }}
$13: {{ $json.testRun.automation_bug_tests }}
$14: {{ $json.testRun.link_to_report }}
```

**출력:** `{ run_id: 123 }` 형태로 반환됩니다.

### 6. Code 노드 (run_id를 testCases에 추가)

**설정:**

- **Language**: `JavaScript`
- **Mode**: `Run Once for All Items` 선택 (중요!)
- **Code**:
  ```javascript
  // 모든 입력 아이템 가져오기
  const items = $input.all();
  
  // 첫 번째 Code 노드의 출력 찾기 (testCases 포함)
  const firstCodeOutput = items.find(item => item.json && item.json.testCases) || items[0];
  const testCases = firstCodeOutput?.json?.testCases || [];
  
  // PostgreSQL 노드의 출력 찾기 (run_id 포함)
  const postgresOutput = items.find(item => item.json && item.json.run_id);
  const runId = postgresOutput?.json?.run_id;
  
  if (!runId) {
    throw new Error('run_id를 찾을 수 없습니다.');
  }
  
  // 각 testCase에 run_id 추가
  const testCasesWithRunId = testCases.map(testCase => ({
    ...testCase,
    run_id: runId
  }));
  
  // 각 testCase를 개별 아이템으로 반환
  return testCasesWithRunId.map(testCase => ({
    json: testCase
  }));
  ```

**중요:** 
- 이 노드의 **Mode**를 반드시 `Run Once for All Items`로 설정해야 합니다.
- Settings 탭에서 "Run Once for Each Item"을 체크 해제하고 "Run Once for All Items"를 선택하세요.

### 7. Loop Over Items 노드 (또는 Split In Batches 노드)

**방법 1: Loop Over Items 노드 사용**

**설정:**
- **Field to Split Out**: `json` (또는 비워두기 - 기본값)
- **Options**: 기본값 사용

**동작:** Code 노드에서 반환된 testCases 배열의 각 요소를 개별 아이템으로 분리합니다.

**방법 2: Split In Batches 노드 사용**

**설정:**
- **Batch Size**: `1`
- **Options**: 기본값 사용

**동작:** Code 노드에서 반환된 testCases 배열을 각각 개별 아이템으로 분리합니다.

**참고:** 두 방법 모두 동일하게 동작하지만, Loop Over Items가 더 직관적입니다.

### 8. PostgreSQL 노드 (test_cases 저장)

**설정:**

- **Operation**: `Execute Query`
- **Query**:
  ```sql
  INSERT INTO test_cases (run_id, suite_name, test_name, status, duration_ms, error_message, stack_trace, start_time, end_time, severity, owner, tags, attachments)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
  ```
- **Parameters**: Expression 모드(`fx` 버튼)로 각 파라미터 매핑

**복사-붙여넣기용 Parameters:**

```
$1: {{ $json.run_id }}
$2: {{ $json.suite_name }}
$3: {{ $json.test_name }}
$4: {{ $json.status }}
$5: {{ $json.duration_ms }}
$6: {{ $json.error_message }}
$7: {{ $json.stack_trace }}
$8: {{ $json.start_time }}
$9: {{ $json.end_time }}
$10: {{ $json.severity }}
$11: {{ $json.owner }}
$12: {{ $json.tags ? JSON.stringify($json.tags) : null }}
$13: {{ $json.attachments }}
```

**중요:** 
- "replace me" 텍스트가 보이면 반드시 `fx` 버튼을 클릭하여 Expression 모드를 활성화한 후 위의 표현식을 입력하세요.
- Expression 모드가 활성화되면 파라미터 필드가 파란색으로 표시됩니다.
- `run_id`는 두 번째 Code 노드에서 이미 각 testCase에 추가되었으므로 `{{ $json.run_id }}`로 접근할 수 있습니다.

### 9. Slack 노드 (알림)

**설정:**

- **Channel**: `C07KHG2TS48`
- **Text**:
  ```
  Test Status:
  Total Tests: {{ $json.totalTests }}, Passed: {{ $json.passedTests }}, Failed: {{ $json.failedTests }}, Skipped: {{ $json.skippedTests }}
  {{ $json.testStatus === 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요' }}
  ```

---

## Allure에서 DB 누적치 표시

### 옵션 1: Allure Report + DB 쿼리 (권장)

1. **Allure Report 생성**: `npm run allure:generate`
2. **DB에서 히스토리 조회**: 별도 대시보드나 스크립트로 DB 쿼리
3. **통합**: Allure Report와 DB 데이터를 함께 표시

### 옵션 2: Allure History Plugin 사용

Allure는 기본적으로 `allure-results/history` 폴더에 히스토리를 저장합니다. 이를 DB와 연동하려면:

1. DB에서 이전 실행 결과를 읽어서 `allure-results/history` 형식으로 변환
2. Allure Report 생성 시 히스토리 포함

### 옵션 3: 간단한 대시보드 (n8n으로 만들기)

n8n에서 간단한 대시보드 워크플로우를 만들어서:
1. PostgreSQL에서 최근 테스트 실행 조회
2. 통계 계산
3. HTML 리포트 생성 또는 Slack에 주간 리포트 전송

---

## 최종 워크플로우 요약

```
[GitHub Webhook] ──┐
                    ├──→ [IF 조건] ──→ [Execute Command: npm run test:sanity]
[Manual Webhook] ───┘
                                              ↓
                                    [Code: result.json 파싱]
                                    출력: { testRun: {...}, testCases: [...] }
                                              ↓
                                    [PostgreSQL: test_runs 저장]
                                    입력: testRun 데이터
                                    출력: { run_id: 123 }
                                              ↓
                                    [Code: run_id를 testCases에 추가]
                                    입력: 이전 Code 노드의 testCases + run_id
                                    출력: [{ run_id: 123, suite_name: "...", ... }, ...]
                                              ↓
                                    [Split In Batches]
                                    Batch Size: 1
                                    출력: 각 testCase가 개별 아이템으로 분리
                                              ↓
                                    [PostgreSQL: test_cases 저장]
                                    입력: 각 testCase (run_id 포함)
                                    각 testCase마다 개별 INSERT 실행
                                              ↓
                                    [Slack 알림]
                                    입력: 첫 번째 Code 노드의 통계 데이터
```

---

## 장점

1. **간단함**: result.json만 파싱하면 됨
2. **명확함**: 각 단계가 명확하게 분리됨
3. **유지보수 용이**: 복잡한 로직 없이 단순하게 처리
4. **확장 가능**: 나중에 Allure Results도 추가 가능

---

## 다음 단계

1. 워크플로우 생성 및 테스트
2. DB에 데이터가 제대로 저장되는지 확인
3. Allure Report 생성 및 히스토리 연동
4. 필요시 대시보드 추가


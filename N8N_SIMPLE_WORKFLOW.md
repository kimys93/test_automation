# n8n 간단한 워크플로우 가이드

테스트 실행 → result.json DB 저장 → Allure에서 누적치 표시

## 목표

1. 테스트 수행
2. `test-results/results.json`을 DB에 저장
3. 영구적으로 저장된 DB를 토대로 Allure에서 테스트 결과 누적치 표시

## 워크플로우 구조

```
[GitHub Webhook] ──┐
                    ├──→ [IF 조건] ──→ [Slack 알림: GitHub 푸시 알림]
[Manual Webhook] ───┘              (테스트 실행 없음)
                    │
                    └──→ [IF 조건: Manual Test] ──→ [Execute Command: npm run test:sanity]
                                              ↓
                                    [Code: result.json 파싱]
                                    (testRun + testCases 배열 반환)
                                              ↓
                                    [PostgreSQL: test_runs 저장]
                                    (run_id 반환)
                                              ↓
                                    [Code: run_id를 testCases에 추가]
                                    Mode: Run Once for All Items
                                    (testCases 배열을 개별 아이템으로 변환)
                                              ↓
                                    [PostgreSQL: test_cases 저장]
                                    (n8n이 자동으로 각 testCase에 대해 실행)
                                              ↓
                                    [Slack 알림: 테스트 결과]
```

## 단계별 설정

### 1. Webhook 노드 (GitHub + 수동 실행)

**GitHub Webhook:**
- Path: `github-webhook`
- HTTP Method: `POST`
- **Respond**: `Immediately` (또는 "Using 'Respond to Webhook' Node" 선택 시 워크플로우 끝에 "Respond to Webhook" 노드 추가 필요)

**GitHub Webhook 설정:**
- GitHub 저장소 → Settings → Webhooks → Add webhook
- Payload URL: `http://YOUR_SERVER_IP:5678/webhook/github-webhook`
- Content type: `application/json`
- Events: `Just the push event` (또는 원하는 이벤트 선택)
- Secret: (선택사항) Signature Secret 설정 가능

**참고:**
- GitHub Webhook은 GitHub에서 자동으로 전송하는 이벤트이므로 별도의 body 설정이 필요 없습니다.
- GitHub가 push 이벤트 발생 시 자동으로 POST 요청을 보냅니다.
- IF 조건 노드에서 `body.trigger !== 'manual'`이므로 테스트는 실행되지 않고 알림만 전송됩니다.

**Manual Webhook:**
- Path: `manual-test`
- HTTP Method: `POST`
- **Respond**: `Immediately` (또는 "Using 'Respond to Webhook' Node" 선택 시 워크플로우 끝에 "Respond to Webhook" 노드 추가 필요)

**Manual Webhook Body 예시 (cURL 또는 HTTP 요청 시):**
```json
{
  "trigger": "manual",
  "build_number": "test-001",
  "git_commit": "abc123",
  "test_type": "sanity"
}
```

**필수 필드:**
- `trigger`: 반드시 `"manual"`로 설정 (IF 조건 노드에서 이 값을 확인)
- `build_number`: 빌드 번호 (예: "test-001", "local")
- `git_commit`: Git 커밋 해시 (예: "abc123", "local")
- `test_type`: 테스트 타입 (예: "sanity", "regression", "functional")

### 2. IF 조건 노드 (Manual Test 확인)

**설정:**
- 조건: `{{ $json.body.trigger }}` `is equal to` `manual`

**동작:**
- Manual Test인 경우: `true` 출력 → 테스트 실행
- GitHub Webhook인 경우: `false` 출력 → 테스트 실행 스킵 (GitHub 푸시 알림만)

**중요:** 
- `true` 출력: Execute Command 노드(테스트 실행)에 연결
- `false` 출력: Slack 노드에 연결하여 GitHub 푸시 알림만 전송 (선택사항)

### 3. Execute Command 노드 (테스트 실행)

**방법 1: Working Directory 설정 (권장)**
- **Command**: `npm run test:sanity`
- **Working Directory**: `/workspace` (직접 입력, Expression 모드 비활성화)

**방법 2: Command에 경로 포함**
- **Command**: `cd /workspace && npm run test:sanity`
- **Working Directory**: (비워두거나 `/home/node` 유지)

**중요:**
- n8n 컨테이너 내부에서 실행되므로 Linux 경로(`/workspace`)를 사용합니다.
- `docker-compose.yml`에서 프로젝트 디렉토리가 `/workspace`로 마운트되어 있습니다.
- Working Directory 필드에 `/workspace`를 입력할 때 Expression 모드(`fx` 버튼)가 꺼져 있어야 합니다.
- 만약 `/home/node/package.json` 에러가 발생하면, n8n 컨테이너를 재시작하세요: `docker-compose restart n8n`

### 4. Code 노드 (result.json 파싱 및 DB 저장 준비)

**설정:**

```javascript
const fs = require('fs');
const path = require('path');

// result.json 읽기 (n8n 컨테이너 내부 경로 사용)
const resultsPath = path.join('/workspace', 'test-results', 'results.json');
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

// test_runs 테이블 데이터 (스키마에 맞게 수정)
const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const status = results.stats.failed > 0 ? 'FAILED' : (results.stats.skipped > 0 ? 'SKIPPED' : 'PASSED');

const testRunData = {
  run_id: runId,
  test_type: testType,
  environment: 'local', // 또는 'CI'
  browser: 'chromium',
  started_at: startTime.toISOString(),
  finished_at: endTime.toISOString(),
  status: status,
  total_tests: results.stats.total,
  passed_tests: results.stats.passed,
  failed_tests: results.stats.failed,
  skipped_tests: results.stats.skipped,
  duration_ms: durationMs,
  build_number: buildNumber,
  commit_hash: gitCommit
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
                // status를 대문자로 변환 (스키마 요구사항: PASSED, FAILED, SKIPPED, BROKEN)
                const status = finalResult.status ? finalResult.status.toUpperCase() : 'UNKNOWN';
                
                testCases.push({
                  suite_name: suite.title || 'Unknown Suite',
                  test_name: test.title || 'Unknown Test',
                  status: status,
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
  INSERT INTO test_runs (run_id, test_type, environment, browser, started_at, finished_at, status, total_tests, passed_tests, failed_tests, skipped_tests, duration_ms, build_number, commit_hash)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING id;
  ```
- **Parameters**: Expression 모드(`fx` 버튼)로 각 파라미터 매핑

**복사-붙여넣기용 Parameters:**

```
$1: {{ $json.testRun.run_id }}
$2: {{ $json.testRun.test_type }}
$3: {{ $json.testRun.environment }}
$4: {{ $json.testRun.browser }}
$5: {{ $json.testRun.started_at }}
$6: {{ $json.testRun.finished_at }}
$7: {{ $json.testRun.status }}
$8: {{ $json.testRun.total_tests }}
$9: {{ $json.testRun.passed_tests }}
$10: {{ $json.testRun.failed_tests }}
$11: {{ $json.testRun.skipped_tests }}
$12: {{ $json.testRun.duration_ms }}
$13: {{ $json.testRun.build_number }}
$14: {{ $json.testRun.commit_hash }}
```

**출력:** `{ id: 123 }` 형태로 반환됩니다. (test_runs 테이블의 PRIMARY KEY인 `id` 반환)

### 6. Code 노드 (test_run_id를 testCases에 추가)

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
  
  // PostgreSQL 노드의 출력 찾기 (id 포함 - test_runs 테이블의 PRIMARY KEY)
  const postgresOutput = items.find(item => item.json && item.json.id);
  const testRunId = postgresOutput?.json?.id; // test_runs 테이블의 id (test_run_id로 사용)
  
  if (!testRunId) {
    throw new Error('test_runs의 id를 찾을 수 없습니다.');
  }
  
  // 각 testCase에 test_run_id 추가 (test_cases 테이블의 외래키)
  const testCasesWithRunId = testCases.map(testCase => ({
    ...testCase,
    test_run_id: testRunId
  }));
  
  // 각 testCase를 개별 아이템으로 반환
  return testCasesWithRunId.map(testCase => ({
    json: testCase
  }));
  ```

**중요:** 
- 이 노드의 **Mode**를 반드시 `Run Once for All Items`로 설정해야 합니다.
- Settings 탭에서 "Run Once for Each Item"을 체크 해제하고 "Run Once for All Items"를 선택하세요.

**참고:** 
- Code 노드에서 이미 각 testCase를 개별 아이템으로 반환했으므로, **Loop Over Items 노드는 필요 없습니다!**
- n8n이 자동으로 각 아이템에 대해 다음 PostgreSQL 노드를 실행합니다.
- **만약 워크플로우가 오래 걸리거나 멈춘다면:** Loop Over Items 노드를 추가하는 것을 고려하세요.

### 7. (선택사항) Loop Over Items 노드

**설정:**
- **Field to Split Out**: `json` (또는 비워두기)
- **Options**: 기본값 사용

**사용 시나리오:**
- Code 노드의 자동 반복이 제대로 동작하지 않을 때
- 명시적으로 각 testCase를 하나씩 처리하고 싶을 때

**참고:** 
- 이 노드는 선택사항입니다. Code 노드가 올바르게 배열을 반환하면 필요 없습니다.
- 하지만 명시적으로 사용하면 더 안정적일 수 있습니다.

### 8. PostgreSQL 노드 (test_cases 저장)

**설정:**

- **Operation**: `Execute Query`
- **Query**:
  ```sql
  INSERT INTO test_cases (test_run_id, suite_name, test_name, test_full_name, status, duration_ms, error_message, error_stack, attachments, steps)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
  ```
- **Parameters**: Expression 모드(`fx` 버튼)로 각 파라미터 매핑

**복사-붙여넣기용 Parameters:**

```
$1: {{ $json.test_run_id }}
$2: {{ $json.suite_name }}
$3: {{ $json.test_name }}
$4: {{ $json.test_name }}
$5: {{ $json.status }}
$6: {{ $json.duration_ms }}
$7: {{ $json.error_message }}
$8: {{ $json.stack_trace }}
$9: {{ $json.attachments ? JSON.stringify($json.attachments) : null }}
$10: null
```

**중요:** 
- "replace me" 텍스트가 보이면 반드시 `fx` 버튼을 클릭하여 Expression 모드를 활성화한 후 위의 표현식을 입력하세요.
- Expression 모드가 활성화되면 파라미터 필드가 파란색으로 표시됩니다.
- `test_run_id`는 두 번째 Code 노드에서 이미 각 testCase에 추가되었으므로 `{{ $json.test_run_id }}`로 접근할 수 있습니다.
- `$4` (test_full_name): test_name과 동일하게 설정 (스키마 요구사항)
- `$5` (status): 'PASSED', 'FAILED', 'SKIPPED', 'BROKEN' 중 하나
- `$9` (attachments): JSONB 타입이므로 JSON.stringify 필요
- `$10` (steps): 현재 null로 설정 (필요시 Code 노드에서 추가)

### 9. Slack 노드 (테스트 결과 알림)

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
                                    출력: [{ test_run_id: 123, suite_name: "...", ... }, ...]
                                    (n8n이 자동으로 각 testCase에 대해 다음 노드 실행)
                                              ↓
                                    [PostgreSQL: test_cases 저장]
                                    입력: 각 testCase (test_run_id 포함)
                                    n8n이 자동으로 각 testCase마다 개별 INSERT 실행
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


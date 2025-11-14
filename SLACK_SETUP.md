# Slack 알림 설정 가이드

## 개요
테스트 결과를 Slack으로 전송하기 위한 설정 방법입니다.

## 1. Slack Webhook URL 생성

1. **Slack 워크스페이스**에서 앱 추가
2. **Incoming Webhooks** 검색 및 설치
3. **Add to Slack** 클릭
4. 알림을 받을 **채널 선택**
5. **Webhook URL 복사** (예: `https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ`)

## 2. Jenkins Credentials 설정

1. **Jenkins 관리 → Credentials → System → Global credentials**
2. **Add Credentials** 클릭
3. 설정:
   - **Kind**: Secret text
   - **Secret**: Slack Webhook URL 붙여넣기
   - **ID**: `slack-webhook-url` (중요: Jenkinsfile.report에서 사용하는 ID)
   - **Description**: "Slack Webhook URL for test notifications"
4. **Create** 클릭

## 3. Jenkins 파이프라인 생성

### 3.1 테스트 파이프라인 (test_automation)
- **Jenkinsfile** 사용
- 테스트 실행 및 결과 JSON 저장

### 3.2 Slack 알림 파이프라인 (test_automation_slack)
1. **새 Item** 클릭
2. **Pipeline** 선택
3. 이름: `test_automation_slack`
4. **Pipeline** 섹션에서:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: `https://github.com/kimys93/test_automation.git`
   - **Branch**: `*/main`
   - **Script Path**: `Jenkinsfile.report`
5. **Save**

## 4. 사용 방법

### 자동 실행 (권장)
- `test_automation` 파이프라인이 완료되면 자동으로 `test_automation_slack`이 트리거됩니다.

### 수동 실행
1. Jenkins 대시보드에서 **test_automation_slack** 선택
2. **Build with Parameters** 클릭
3. **BUILD_NUMBER**에 테스트 빌드 번호 입력 (비워두면 최신 성공 빌드 사용)
4. **Build** 클릭

## 5. 필요한 Jenkins 플러그인

- **HTTP Request Plugin**: Slack API 호출용
- **Copy Artifacts Plugin**: 테스트 결과 파일 복사용
- **Pipeline Utility Steps Plugin**: JSON 파싱용

설치 방법:
1. **Jenkins 관리 → 플러그인 관리**
2. **사용 가능** 탭에서 검색 후 설치

## 6. Slack 메시지 예시

```
🚀 Test Automation Results ✅ PASSED

📊 Test Summary
• Total: 6
• ✅ Passed: 4
• ❌ Failed: 2
• ⏭️ Skipped: 0

🔗 Links
• Test Report: http://192.168.219.103:8080/job/test_automation/
• Build: http://192.168.219.103:8080/job/test_automation_slack/1/
```

## 문제 해결

### "Credentials not found" 오류
- Jenkins Credentials에서 `slack-webhook-url` ID가 정확한지 확인

### "Test results file not found" 오류
- `test_automation` 파이프라인이 성공적으로 완료되었는지 확인
- `test-results/results.json` 파일이 아티팩트로 저장되었는지 확인

### Slack 메시지가 전송되지 않음
- HTTP Request Plugin이 설치되었는지 확인
- Webhook URL이 유효한지 확인 (Slack 앱에서 재생성 가능)


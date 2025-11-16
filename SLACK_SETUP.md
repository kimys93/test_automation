# Slack 알림 설정 가이드

## 개요
테스트 결과를 Slack으로 전송하기 위한 설정 방법입니다. **Slack Send 플러그인**을 사용하여 간단하게 설정할 수 있습니다.

## 1. Slack Send 플러그인 설치

1. **Jenkins 관리 → 플러그인 관리**
2. **사용 가능** 탭에서 **"Slack Notification"** 또는 **"Slack"** 검색
3. **Slack Notification** 플러그인 설치
4. Jenkins 재시작

## 2. Slack Workspace에 Jenkins 앱 추가

1. **Slack 워크스페이스**에서 [Slack Apps 페이지](https://api.slack.com/apps) 접속
2. **Create New App** 클릭
3. **From scratch** 선택
4. **App Name**: `Jenkins` (또는 원하는 이름)
5. **Workspace**: 알림을 받을 워크스페이스 선택
6. **Create App** 클릭

### 2.1 OAuth & Permissions 설정

1. 좌측 메뉴에서 **OAuth & Permissions** 선택
2. **Scopes** 섹션의 **Bot Token Scopes**에서 다음 권한 추가:
   - `chat:write` - 메시지 전송
   - `chat:write.public` - 공개 채널에 메시지 전송
   - `channels:read` - 채널 정보 읽기 (선택사항)
3. 페이지 상단으로 스크롤하여 **Install to Workspace** 클릭
4. 권한 승인 후 **Bot User OAuth Token** 복사 (예: `xoxb-XXXXX-YYYYY-ZZZZZ`)

## 3. Jenkins Credentials 설정

1. **Jenkins 관리 → Credentials → System → Global credentials (unrestricted)**
2. **Add Credentials** 클릭
3. 설정:
   - **Kind**: Secret text
   - **Secret**: Slack Bot User OAuth Token 붙여넣기 (2.1에서 복사한 토큰)
   - **ID**: `slack-token` (중요: Jenkinsfile에서 사용하는 ID)
   - **Description**: "Slack Bot Token for test notifications"
4. **Create** 클릭

## 4. Jenkinsfile 설정 확인

Jenkinsfile에서 이미 `slackSend`를 사용하도록 설정되어 있습니다:

```groovy
slackSend(
    channel: '채널명',
    color: testStatus == 'Success' ? 'good' : 'danger',
    message: message,
    tokenCredentialId: 'slack-token'
)
```

### 채널 ID 확인 방법

1. Slack에서 알림을 받을 채널 선택
2. 채널 이름 옆 **정보 아이콘** 클릭
3. **About** 탭에서 **Channel ID** 확인 (예: `C80EFA0GF`)
4. 또는 채널 URL에서 확인: `https://workspace.slack.com/archives/C80EFA0GF`

## 5. 사용 방법

### 자동 실행
- 테스트 파이프라인이 완료되면 자동으로 Slack 알림이 전송됩니다.
- 테스트 결과에 따라 성공/실패 메시지가 자동으로 전송됩니다.

### 수동 실행
- Jenkins 파이프라인을 수동으로 실행하면 테스트 완료 후 자동으로 Slack 알림이 전송됩니다.

## 6. Slack 메시지 예시

```
Test Status:
Total Tests: 6, Passed: 5, Failed: 1, Skipped: 0 - (Open)

✅ Success - 모든 테스트 성공

⚠️ Non-Passed Tests:
• 검색 기능 - 실제 검색 결과 확인 [Failed]
```

## 문제 해결

### "Credentials not found" 오류
- Jenkins Credentials에서 `slack-token` ID가 정확한지 확인
- Credentials의 Secret에 Bot User OAuth Token이 올바르게 입력되었는지 확인

### "Slack API error" 오류
- Slack Bot Token이 유효한지 확인 (만료되었을 수 있음)
- Slack 앱에서 필요한 권한(`chat:write`, `chat:write.public`)이 추가되었는지 확인

### Slack 메시지가 전송되지 않음
- Slack Notification 플러그인이 설치되었는지 확인
- Jenkins를 재시작했는지 확인
- 채널 ID가 정확한지 확인 (채널에 봇이 초대되어 있어야 함)

### 봇이 채널에 메시지를 보낼 수 없음
- Slack 채널에서 `/invite @Jenkins` 명령어로 봇을 채널에 초대
- 또는 채널 설정에서 봇을 멤버로 추가


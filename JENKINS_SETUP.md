# Jenkins HTML 리포트 샌드박스 문제 해결

## 문제
Jenkins에서 HTML 리포트를 열면 흰 화면만 표시되는 문제가 발생합니다. 이는 Jenkins의 Content Security Policy (CSP)가 HTML 콘텐츠를 샌드박스로 실행하기 때문입니다.

## 해결 방법

### 방법 1: Jenkins plist 파일에 Java 옵션 추가 (가장 확실한 방법) ⭐

**macOS에서 Homebrew로 설치한 Jenkins의 경우:**

Jenkins가 재시작될 때마다 설정이 유지되도록 plist 파일에 Java 옵션을 추가합니다.

1. Jenkins plist 파일 백업:
   ```bash
   cp ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist.backup
   ```

2. plist 파일 편집:
   ```bash
   vi ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist
   # 또는
   nano ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist
   ```

3. `ProgramArguments` 배열에서 Java 옵션 부분을 찾아 다음 줄 추가:
   ```xml
   <string>-Dmail.smtp.starttls.enable=true</string>
   <string>-Dhudson.model.DirectoryBrowserSupport.CSP=</string>  <!-- 이 줄 추가 -->
   ```

4. Jenkins 재시작:
   ```bash
   launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist
   launchctl load ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist
   ```

   또는:
   ```bash
   brew services restart jenkins-lts
   ```

5. 확인:
   ```bash
   ps aux | grep jenkins | grep CSP
   ```
   `-Dhudson.model.DirectoryBrowserSupport.CSP=` 옵션이 보이면 성공입니다.

### 방법 2: Jenkins 설정 파일 직접 수정 (재시작 시 초기화될 수 있음)

Jenkins가 설치된 서버에 접속하여 설정 파일을 직접 수정합니다.

1. Jenkins 홈 디렉토리로 이동:
   ```bash
   cd ~/.jenkins
   ```

2. `config.xml` 파일 백업:
   ```bash
   cp config.xml config.xml.backup
   ```

3. `config.xml` 파일 편집:
   ```bash
   vi config.xml
   # 또는
   nano config.xml
   ```

4. `<useSecurity>true</useSecurity>` 태그 바로 다음에 다음 내용 추가:
   ```xml
   <useSecurity>true</useSecurity>
   <disableStrictCSP>true</disableStrictCSP>
   ```

5. 또는 `<disabledAdministrativeMonitors>` 섹션이 있다면 다음 항목 추가:
   ```xml
   <disabledAdministrativeMonitors>
     <string>org.jenkinsci.plugins.htmlpublisher.HtmlPublisher$CSP</string>
     <!-- 기존 항목들... -->
   </disabledAdministrativeMonitors>
   ```

6. Jenkins 재시작:
   ```bash
   # macOS (Homebrew로 설치한 경우)
   brew services restart jenkins
   
   # 또는 Jenkins 웹 인터페이스에서
   # Jenkins 관리 → 안전하게 재시작 (Safe Restart)
   ```

### 방법 2: Jenkins 시스템 설정에서 CSP 완화 (최신 버전)

최신 Jenkins 버전에서는 다음 방법을 시도해볼 수 있습니다:

1. **Jenkins 관리** → **시스템 설정** (Manage Jenkins → Configure System)
2. 페이지를 아래로 스크롤하여 **"Content Security Policy"** 또는 **"Security"** 섹션 찾기
3. **"Content Security Policy"** 필드에 다음 입력:
   ```
   sandbox allow-scripts allow-same-origin allow-popups allow-forms
   ```
   또는 완전히 비활성화하려면 빈 값으로 두기
4. **저장** 클릭
5. Jenkins 재시작

**참고**: 최신 Jenkins 버전에 따라 이 옵션이 보이지 않을 수 있습니다. 그 경우 방법 1을 사용하세요.

### 방법 3: Jenkins 시스템 설정에서 CSP 완화 (최신 버전, 재시작 시 유지 안 됨)

Jenkins를 시작할 때 Java 옵션을 추가합니다.

1. Jenkins 실행 스크립트 또는 `jenkins.xml` 파일 찾기
2. Java 옵션에 다음 추가:
   ```
   -Dhudson.model.DirectoryBrowserSupport.CSP=""
   ```
3. Jenkins 재시작

### 방법 4: 리포트 다운로드 링크 사용

Jenkinsfile에서 리포트를 다운로드 링크로 제공하도록 설정되어 있습니다. Slack 메시지의 "다운로드" 링크를 클릭하여 리포트를 다운로드한 후 로컬에서 열 수 있습니다.

## 확인 방법

설정 변경 후:
1. Jenkins 파이프라인 실행
2. 빌드 완료 후 "Playwright Report" 링크 클릭
3. HTML 리포트가 정상적으로 표시되는지 확인

## 참고

- 이 설정은 보안을 완화하므로, 개인 환경이나 신뢰할 수 있는 환경에서만 사용하세요
- 프로덕션 환경에서는 보안을 고려하여 다른 방법을 사용하는 것을 권장합니다


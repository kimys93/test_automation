# Jenkins HTML 리포트 샌드박스 문제 해결

## 문제
Jenkins에서 HTML 리포트를 열면 흰 화면만 표시되는 문제가 발생합니다. 이는 Jenkins의 Content Security Policy (CSP)가 HTML 콘텐츠를 샌드박스로 실행하기 때문입니다.

## 해결 방법 (가장 확실한 방법) ⭐

**macOS에서 Homebrew로 설치한 Jenkins의 경우:**

Jenkins가 재시작될 때마다 설정이 유지되도록 plist 파일에 Java 옵션을 추가합니다.

### 1. Homebrew 원본 plist 파일 수정

1. **plist 파일 찾기:**
   ```bash
   find /opt/homebrew/Cellar/jenkins-lts -name "*.plist" -type f
   ```

2. **plist 파일 백업:**
   ```bash
   cp /opt/homebrew/Cellar/jenkins-lts/2.528.2/homebrew.mxcl.jenkins-lts.plist \
      /opt/homebrew/Cellar/jenkins-lts/2.528.2/homebrew.mxcl.jenkins-lts.plist.backup
   ```

3. **plist 파일 편집:**
   ```bash
   vi /opt/homebrew/Cellar/jenkins-lts/2.528.2/homebrew.mxcl.jenkins-lts.plist
   # 또는
   nano /opt/homebrew/Cellar/jenkins-lts/2.528.2/homebrew.mxcl.jenkins-lts.plist
   ```

4. **`ProgramArguments` 배열에서 Java 옵션 부분을 찾아 다음 줄 추가:**
   ```xml
   <string>-Dmail.smtp.starttls.enable=true</string>
   <string>-Dhudson.model.DirectoryBrowserSupport.CSP=</string>  <!-- 이 줄 추가 -->
   ```

5. **외부 접속을 위해 `--httpListenAddress`도 확인:**
   ```xml
   <string>--httpListenAddress=0.0.0.0</string>  <!-- 127.0.0.1이면 0.0.0.0으로 변경 -->
   ```

### 2. Jenkins 재시작

```bash
brew services restart jenkins-lts
```

### 3. 확인

```bash
# 프로세스 확인
ps aux | grep jenkins | grep CSP

# 포트 확인 (0.0.0.0으로 LISTEN되어야 함)
netstat -an | grep 8080 | grep LISTEN
```

`-Dhudson.model.DirectoryBrowserSupport.CSP=` 옵션이 보이고, 포트가 `*.8080` 또는 `0.0.0.0.8080`으로 LISTEN되면 성공입니다.

## Jenkins URL 설정 (외부 접속용)

### Jenkins 시스템 설정에서 환경 변수 추가

1. **Jenkins 관리** → **시스템 설정** (Manage Jenkins → Configure System)
2. **Global properties** → **Environment variables** 체크
3. **Add** 클릭
4. **Name**: `JENKINS_URL`
5. **Value**: `http://IP 주소` (실제 Jenkins 서버 IP 주소)
6. **저장**

또는 config.xml 파일에서 직접 수정:

```bash
vi ~/.jenkins/config.xml
```

`globalNodeProperties` 섹션에서 `JENKINS_URL` 값을 수정:

```xml
<string>JENKINS_URL</string>
<string>http://IP 주소</string>
```

## 확인 방법

설정 변경 후:
1. Jenkins 파이프라인 실행
2. 빌드 완료 후 "Playwright Report" 링크 클릭
3. HTML 리포트가 정상적으로 표시되는지 확인
4. 외부에서도 접속 가능한지 확인

## 참고

- 이 설정은 보안을 완화하므로, 개인 환경이나 신뢰할 수 있는 환경에서만 사용하세요
- 프로덕션 환경에서는 보안을 고려하여 다른 방법을 사용하는 것을 권장합니다
- plist 파일을 수정하면 Jenkins 재시작 후에도 설정이 유지됩니다

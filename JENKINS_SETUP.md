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

## Linux에서 Jenkins CSP 비활성화 ⭐

**Linux에서 Jenkins를 systemd 서비스로 설치한 경우:**

### 방법 1: systemd 서비스 파일 수정 (권장)

1. **Jenkins 서비스 파일 찾기:**
   ```bash
   # 일반 경로
   /etc/systemd/system/jenkins.service
   # 또는
   /lib/systemd/system/jenkins.service
   ```

2. **서비스 파일 백업:**
   ```bash
   sudo cp /etc/systemd/system/jenkins.service /etc/systemd/system/jenkins.service.backup
   ```

3. **서비스 파일 편집:**
   ```bash
   sudo vi /etc/systemd/system/jenkins.service
   # 또는
   sudo nano /etc/systemd/system/jenkins.service
   ```

4. **`[Service]` 섹션의 `Environment` 또는 `ExecStart` 부분에 Java 옵션 추가:**
   
   **옵션 A: Environment 변수로 추가 (권장)**
   ```ini
   [Service]
   Environment="JENKINS_JAVA_OPTIONS=-Djava.awt.headless=true -Dhudson.model.DirectoryBrowserSupport.CSP="
   ```
   
   **옵션 B: ExecStart에 직접 추가**
   ```ini
   ExecStart=/usr/bin/java -Dhudson.model.DirectoryBrowserSupport.CSP= -jar /usr/share/jenkins/jenkins.war
   ```

5. **systemd 설정 리로드 및 Jenkins 재시작:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart jenkins
   ```

6. **서비스 상태 확인:**
   ```bash
   sudo systemctl status jenkins
   ```

### 방법 2: Jenkins 설정 파일 직접 수정

1. **Jenkins 설정 디렉토리 확인:**
   ```bash
   # 일반 경로
   /var/lib/jenkins
   # 또는 Jenkins 웹 UI에서 확인: Jenkins 관리 → 시스템 정보
   ```

2. **jenkins.xml 파일 수정 (WAR 파일로 실행하는 경우):**
   ```bash
   sudo vi /var/lib/jenkins/jenkins.xml
   ```
   
   `<arguments>` 섹션에 추가:
   ```xml
   <arguments>
     -Xrs -Xmx256m -Dhudson.model.DirectoryBrowserSupport.CSP= -jar /usr/share/jenkins/jenkins.war --httpPort=8080 --webroot=/var/cache/jenkins/war
   </arguments>
   ```

3. **Jenkins 재시작:**
   ```bash
   sudo systemctl restart jenkins
   ```

### 방법 3: 환경 변수 파일로 설정

1. **Jenkins 환경 변수 파일 생성/수정:**
   ```bash
   sudo vi /etc/default/jenkins
   # 또는
   sudo vi /etc/sysconfig/jenkins
   ```

2. **다음 내용 추가:**
   ```bash
   JENKINS_JAVA_OPTIONS="-Djava.awt.headless=true -Dhudson.model.DirectoryBrowserSupport.CSP="
   ```

3. **Jenkins 재시작:**
   ```bash
   sudo systemctl restart jenkins
   ```

### 확인

Jenkins 재시작 후:
1. **프로세스 확인:**
   ```bash
   ps aux | grep jenkins | grep CSP
   ```
   `-Dhudson.model.DirectoryBrowserSupport.CSP=` 옵션이 보이면 성공

2. **빌드 실행 후 Allure Report 링크 클릭하여 HTML 리포트가 정상적으로 표시되는지 확인**

## 참고

- 이 설정은 보안을 완화하므로, 개인 환경이나 신뢰할 수 있는 환경에서만 사용하세요
- 프로덕션 환경에서는 보안을 고려하여 다른 방법을 사용하는 것을 권장합니다
- systemd 서비스 파일을 수정하면 Jenkins 재시작 후에도 설정이 유지됩니다

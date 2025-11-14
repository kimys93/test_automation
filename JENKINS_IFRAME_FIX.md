# Jenkins HTML 리포트 iframe Sandbox 문제 해결 방법

## 문제
HTML Publisher 플러그인이 iframe에 `sandbox` 속성을 추가하여 스크립트 실행이 차단됩니다.
에러: `Blocked script execution because the document's frame is sandboxed and the 'allow-scripts' permission is not set`

## 해결 방법 (우선순위 순)

### 방법 1: Jenkins Groovy Script Console에서 설정 변경 ⭐ (가장 확실)

1. **Jenkins 웹 인터페이스 접속**
   - `http://127.0.0.1:8080` 접속

2. **Script Console 접속**
   - Jenkins 관리 → Script Console
   - 또는 직접 URL: `http://127.0.0.1:8080/script`

3. **다음 Groovy 스크립트 실행 (import 없이):**
   ```groovy
   // CSP 비활성화
   System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
   
   // Jenkins 설정 저장
   jenkins.model.Jenkins.instance.save()
   
   println "CSP has been disabled. Please restart Jenkins."
   ```

4. **Jenkins 재시작**
   ```bash
   brew services restart jenkins-lts
   ```

### 방법 2: Jenkins 시스템 설정에서 CSP 완화

1. **Jenkins 관리** → **시스템 설정** (Manage Jenkins → Configure System)

2. **페이지 하단으로 스크롤**

3. **"Content Security Policy"** 섹션 찾기
   - 만약 보이지 않으면 "Advanced" 버튼 클릭

4. **CSP 필드에 다음 입력:**
   ```
   sandbox allow-scripts allow-same-origin allow-popups allow-forms allow-modals
   ```

5. **저장** 클릭

6. **Jenkins 재시작**

### 방법 3: HTML Publisher 플러그인 JAR 파일 직접 수정 (고급)

1. **플러그인 JAR 파일 찾기:**
   ```bash
   find ~/.jenkins/plugins -name "htmlpublisher*.jar" -type f
   ```

2. **JAR 파일 백업:**
   ```bash
   cd ~/.jenkins/plugins/htmlpublisher
   cp htmlpublisher*.jar htmlpublisher.jar.backup
   ```

3. **JAR 파일 압축 해제:**
   ```bash
   mkdir temp_extract
   cd temp_extract
   jar -xf ../htmlpublisher*.jar
   ```

4. **HTML Publisher 클래스 파일 찾기:**
   ```bash
   find . -name "*HtmlPublisher*.class" -o -name "*HtmlPublisher*.java"
   ```

5. **JAR 파일 수정 (복잡함 - 권장하지 않음)**
   - 이 방법은 플러그인 업데이트 시 초기화됨

### 방법 4: Jenkinsfile에서 publishHTML 옵션 추가

Jenkinsfile의 `publishHTML`에 추가 옵션 시도:

```groovy
publishHTML([
    allowMissing: false,
    alwaysLinkToLastBuild: false,
    keepAll: true,
    reportDir: 'playwright-report',
    reportFiles: 'index.html',
    reportName: 'Playwright Report',
    // 추가 옵션 시도
    reportTitles: 'Playwright Test Report'
])
```

### 방법 5: Jenkins plist 파일에 Java 옵션 추가 (이미 시도함)

plist 파일에 다음 옵션 추가:
```xml
<string>-Dhudson.model.DirectoryBrowserSupport.CSP=</string>
```

하지만 이것만으로는 iframe sandbox 문제가 해결되지 않을 수 있습니다.

## 가장 확실한 해결책

**방법 1 (Groovy Script Console)**을 먼저 시도하세요:

1. Jenkins 웹 → Script Console (`http://127.0.0.1:8080/script`)
2. 다음 스크립트 실행 (import 없이):
   ```groovy
   System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "")
   jenkins.model.Jenkins.instance.save()
   println "CSP disabled. Restart Jenkins."
   ```
3. Jenkins 재시작:
   ```bash
   brew services restart jenkins-lts
   ```

그래도 안 되면 **방법 2 (시스템 설정에서 CSP 완화)**를 시도하세요.

## 확인 방법

### CSP 설정 상태 확인

Script Console에서 다음 스크립트 실행:
```groovy
def cspValue = System.getProperty("hudson.model.DirectoryBrowserSupport.CSP")
println "현재 CSP 설정: ${cspValue ?: '설정되지 않음 (기본값 사용)'}"

if (cspValue == null || cspValue.isEmpty()) {
    println "❌ CSP가 비활성화되지 않았습니다."
} else {
    println "✅ CSP가 비활성화되어 있습니다."
}
```

### 설정이 재시작 후 사라지는 문제

**문제**: `System.setProperty()`로 설정한 값은 Jenkins 재시작 시 사라집니다.

**해결**: plist 파일에 Java 옵션을 추가해야 영구적으로 유지됩니다.

1. plist 파일 편집:
   ```bash
   vi ~/Library/LaunchAgents/homebrew.mxcl.jenkins-lts.plist
   ```

2. `ProgramArguments` 배열에 다음 추가:
   ```xml
   <string>-Dmail.smtp.starttls.enable=true</string>
   <string>-Dhudson.model.DirectoryBrowserSupport.CSP=</string>  <!-- 이 줄 추가 -->
   ```

3. Jenkins 재시작:
   ```bash
   brew services restart jenkins-lts
   ```

4. 확인:
   ```bash
   ps aux | grep jenkins | grep CSP
   ```

### 리포트 표시 확인

설정 변경 후:
1. Jenkins 파이프라인 실행
2. 빌드 완료 후 "Playwright Report" 링크 클릭
3. 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인
4. `sandbox` 관련 에러가 사라졌는지 확인


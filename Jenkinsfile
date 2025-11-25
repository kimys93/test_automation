pipeline {
    agent any
    
    tools {
        nodejs 'Node20'
    }
    
    environment {
        PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${env.PATH}"
        // Jenkins URL 환경 변수 (Jenkins 시스템 설정에서 전역 환경 변수로 설정 필요)
        // Jenkins 관리 → 시스템 설정 → Global properties → Environment variables
        // Name: JENKINS_URL, Value: http://IP 주소:포트
        JENKINS_URL = "${env.JENKINS_URL}"
        TEST_TYPE = "${env.TEST_TYPE}"
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT = "${env.GIT_COMMIT}"
        
        // ReportPortal 설정
        RP_ENDPOINT = "${env.RP_ENDPOINT ?: 'http://10.10.0.30:8082/api/v1'}"
        // RP_TOKEN은 Jenkins Credential로 관리 (credential ID: 'reportportal-token')
        // RP_ENABLED, RP_PROJECT, RP_LAUNCH, RP_DEBUG는 코드에 하드코딩됨
    }
    
    stages {
        stage('Checkout') {
            steps {
                // GitLab 저장소에서 체크아웃 (Jenkins Credentials에 'gitlab-credentials' ID로 저장 필요)
                git url: 'http://10.10.1.39/platformqa/macaron/test_automation.git', 
                     branch: 'main',
                     credentialsId: 'jenkins_test_automation'
            }
        }
        
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
                sh 'npx playwright install'
                sh 'npx playwright install-deps || true'
            }
        }
        
        stage('Run Sanity Tests') {
            steps {
                script {
                    try {
                        // ReportPortal credential 사용
                        withCredentials([string(credentialsId: 'slack-reportportal-token', variable: 'RP_TOKEN')]) {
                            sh """
                                export RP_ENABLED=true
                                export RP_ENDPOINT=http://10.10.0.30:8082/api/v1
                                export RP_TOKEN=${RP_TOKEN}
                                export RP_PROJECT=test_automation
                                export RP_LAUNCH=test-run-${BUILD_NUMBER}
                                export RP_DEBUG=false
                                export TEST_TYPE=sanity
                                export BUILD_NUMBER=${BUILD_NUMBER}
                                export BASE_URL=http://localhost:3000
                                npm run test:sanity
                            """
                        }
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Process Test Results') {
            steps {
                script {
                    // 💡 [수정] Launch ID/UUID 변수를 환경 변수로 선언 (try-catch 블록 경계를 넘나들어도 접근 가능)
                    env.LAUNCH_ID = null
                    env.LAUNCH_UUID = null
                    
                    if (fileExists('playwright-report') && fileExists('test-results')) {
                        sh 'chmod -R 755 playwright-report'
                        sh 'chmod -R 755 test-results'
                        publishHTML([
                            allowMissing: false,
                            alwaysLinkToLastBuild: false,
                            keepAll: true,
                            reportDir: 'playwright-report',
                            reportFiles: 'index.html',
                            reportName: 'Playwright Report'
                        ])
                        archiveArtifacts(
                            artifacts: 'playwright-report/**/*,test-results/**/*',
                            fingerprint: true
                        )
                    }
                    
                    // Allure 리포트 생성
                    if (fileExists('allure-results')) {
                        sh 'npm run allure:generate || true'
                        
                        // Allure 리포트가 생성되었는지 확인
                        if (fileExists('allure-report')) {
                            // Allure 리포트를 ReportPortal에 첨부 (curl 사용)
                            // 💡 [수정] launchId와 launchUuid는 이미 script 블록 상단에서 선언됨
                            try {
                                withCredentials([string(credentialsId: 'slack-reportportal-token', variable: 'RP_TOKEN')]) {
                                    // 1. Launch ID 및 UUID 조회 (이 부분만 Groovy에서 수행)
                                    // Node.js 경고 억제 및 순수 JSON 출력만 캡처
                                    // Launch 이름: sanity (playwright.config.js에서 하드코딩된 이름과 일치)
                                    def launchName = "sanity"
                                    echo "DEBUG: Searching for Launch: ${launchName}"
                                    
                                    def rpInfoJson = sh(returnStdout: true, script: """
                                        export RP_ENDPOINT=http://10.10.0.30:8082/api/v1
                                        export RP_TOKEN=${RP_TOKEN}
                                        export RP_PROJECT=test_automation
                                        # Node.js 경고 억제 옵션 추가 (stderr는 별도로 확인)
                                        node --no-warnings scripts/get-rp-id.js launch ${launchName} 2>&1
                                    """).trim()
                                    
                                    echo "DEBUG: Captured RP Info JSON (raw): [${rpInfoJson}]"
                                    echo "DEBUG: JSON length: ${rpInfoJson.length()}"
                                    
                                    // JSON 문자열 정리 및 파싱 시도 (강화된 버전)
                                    def rpInfo
                                    try {
                                        // 1단계: 모든 제어 문자 및 불필요한 공백 제거
                                        rpInfoJson = rpInfoJson.replaceAll(/[\r\n\t]/, '').replaceAll(/\s+/, ' ').trim()
                                        
                                        // 2단계: JSON 객체 부분만 추출 (중괄호로 시작하고 끝나는 부분)
                                        def jsonMatch = rpInfoJson =~ /\{.*\}/
                                        if (jsonMatch) {
                                            rpInfoJson = jsonMatch[0]
                                        }
                                        
                                        // 3단계: 최종 정리
                                        rpInfoJson = rpInfoJson.trim()
                                        
                                        echo "DEBUG: Cleaned JSON: [${rpInfoJson}]"
                                        
                                        // 4단계: JSON 파싱
                                        rpInfo = new groovy.json.JsonSlurper().parseText(rpInfoJson)
                                        
                                        // 5단계: 필수 필드 검증
                                        if (!rpInfo.id || !rpInfo.uuid) {
                                            throw new Exception("JSON에 필수 필드(id, uuid)가 없습니다.")
                                        }
                                        
                                        // 💡 수정: 환경 변수에 할당 (String으로 변환하여 env에 저장)
                                        env.LAUNCH_ID = rpInfo.id.toString()
                                        env.LAUNCH_UUID = rpInfo.uuid.toString()
                                        echo "DEBUG: Parsed Launch ID: ${env.LAUNCH_ID}, UUID: ${env.LAUNCH_UUID}"
                                        
                                        // rpInfo 객체는 더 이상 필요 없으므로 명시적으로 null 처리하여 직렬화 문제 방지
                                        rpInfo = null
                                    } catch (Exception e) {
                                        echo "ERROR: JSON 파싱 실패: ${e.getMessage()}"
                                        echo "ERROR: Exception class: ${e.getClass().getName()}"
                                        echo "ERROR: JSON 내용 (원본): [${rpInfoJson}]"
                                        echo "ERROR: JSON 내용 (hex): ${rpInfoJson.bytes.collect { String.format('%02x', it) }.join(' ')}"
                                        throw new Exception("ReportPortal 정보 파싱 실패 - 콘솔 출력을 확인하세요.", e)
                                    }
                                    
                                    // 💡 수정: 환경 변수를 사용하여 유효성 검사
                                    if (env.LAUNCH_ID && env.LAUNCH_UUID) {
                                        // 2. 나머지 모든 ReportPortal 연동/업로드/종료 작업을 하나의 sh 블록으로 통합 실행
                                        sh """
                                            export RP_ENDPOINT=http://10.10.0.30:8082/api/v1
                                            export RP_TOKEN=${RP_TOKEN}
                                            export RP_PROJECT=test_automation
                                            # 💡 수정: Groovy 환경 변수를 쉘 변수로 전달
                                            export LAUNCH_ID=${env.LAUNCH_ID}
                                            export LAUNCH_UUID=${env.LAUNCH_UUID}
                                            
                                            echo "⚡️ Launch \$LAUNCH_ID 상태를 ACTIVE로 변경..."
                                            node scripts/get-rp-id.js update \$LAUNCH_ID ACTIVE
                                            echo "DEBUG: Launch \$LAUNCH_ID 상태를 ACTIVE로 변경 완료"
                                            
                                            echo "🔎 Test Item ID 조회..."
                                            ITEM_ID=\$(node scripts/get-rp-id.js item \$LAUNCH_ID)
                                            echo "DEBUG: Item ID: \$ITEM_ID"
                                            
                                            echo "📝 JSON 요청 파트 생성..."
                                            NOW=\$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
                                            
                                            # Jenkins Allure 리포트 URL 생성 (이중 슬래시 방지)
                                            JENKINS_URL=\${JENKINS_URL:-http://10.10.0.159:8080}
                                            JENKINS_URL=\${JENKINS_URL%/}  # 끝의 슬래시 제거
                                            JOB_NAME=\${JOB_NAME:-test_automation}
                                            BUILD_NUMBER=\${BUILD_NUMBER:-1}
                                            ALLURE_REPORT_URL="\${JENKINS_URL}/job/\${JOB_NAME}/\${BUILD_NUMBER}/Allure_20Report/"
                                            
                                            # JSON 파일 생성 (마크다운 링크 형식 시도)
                                            # heredoc 사용하여 JSON 이스케이프 문제 해결
                                            # 쉘 변수는 $변수명 형식 사용 (이스케이프 제거)
                                            cat > rp-json-part.txt <<EOF
[{"itemUuid":"$ITEM_ID","launchUuid":"$LAUNCH_UUID","level":"INFO","message":"Allure Report: [Open Allure Report]($ALLURE_REPORT_URL)","time":"$NOW"}]
EOF
                                            
                                            echo "📤 ReportPortal에 Allure 리포트 링크 전송 중..."
                                            echo "DEBUG: JSON 요청 파트 내용 확인..."
                                            cat rp-json-part.txt
                                            
                                            # ReportPortal 로그 API에 링크만 전송 (multipart 형식 유지, 파일 없이 JSON만)
                                            HTTP_CODE=\$(curl -X POST "\$RP_ENDPOINT/\$RP_PROJECT/log" \\
                                                -H "Authorization: Bearer \$RP_TOKEN" \\
                                                -F "json_request_part=@rp-json-part.txt;type=application/json" \\
                                                -w "%{http_code}" -o /tmp/rp-upload-response.txt -s)
                                            
                                            if [ "\$HTTP_CODE" -lt 200 ] || [ "\$HTTP_CODE" -ge 300 ]; then
                                                echo "❌ ReportPortal 링크 전송 실패: HTTP \$HTTP_CODE"
                                                echo "DEBUG: ReportPortal 서버 응답 내용:"
                                                if [ -f /tmp/rp-upload-response.txt ]; then
                                                    cat /tmp/rp-upload-response.txt
                                                else
                                                    echo "응답 파일이 없습니다."
                                                fi
                                                echo "DEBUG: JSON 요청 파트 재확인:"
                                                cat rp-json-part.txt
                                                rm -f /tmp/rp-upload-response.txt
                                                exit 1
                                            else
                                                echo "✅ ReportPortal 링크 전송 성공: HTTP \$HTTP_CODE"
                                                echo "DEBUG: 응답 내용:"
                                                if [ -f /tmp/rp-upload-response.txt ]; then
                                                    cat /tmp/rp-upload-response.txt
                                                else
                                                    echo "응답 파일이 없습니다."
                                                fi
                                                rm -f /tmp/rp-upload-response.txt
                                            fi
                                            
                                            echo "😴 Launch \$LAUNCH_ID 상태를 STOPPED로 변경..."
                                            node scripts/get-rp-id.js update \$LAUNCH_ID STOPPED
                                            echo "DEBUG: Launch \$LAUNCH_ID 상태를 STOPPED로 변경 완료"
                                            
                                            echo "✅ 임시 파일 삭제..."
                                            rm -f rp-json-part.txt
                                            echo "✅ 임시 파일 삭제 완료"
                                        """
                                        
                                        echo "✅ 완료! Allure 리포트가 Launch ${env.LAUNCH_ID}에 첨부되었습니다."
                                    } else {
                                        echo "⚠️ Launch ID 또는 UUID가 유효하지 않아 업로드를 건너뜁니다. (launchId: ${env.LAUNCH_ID}, launchUuid: ${env.LAUNCH_UUID})"
                                    }
                                }
                            } catch (Exception e) {
                                // 여기서 실패 시: Agent 연결 끊김 또는 JSON 파싱 문제일 가능성이 높음
                                // 안전한 에러 메시지 처리 (2차 오류 방지)
                                String errorMessage = "Unknown error"
                                String errorClass = "Unknown"
                                try {
                                    errorMessage = e.getMessage() ?: "Unknown Groovy error. Please check console for details."
                                    errorClass = e.getClass().getName()
                                } catch (Exception innerE) {
                                    errorMessage = "Could not retrieve exception message: ${innerE.getClass().getName()}"
                                }
                                
                                // 💡 수정: Groovy의 String Interpolation으로 인한 2차 오류를 방지하기 위해 
                                // echo 문에서 String Interpolation이 아닌, 단순 문자열을 먼저 선언하고 출력
                                String failureMessage = "ReportPortal에 Allure 리포트 첨부 실패: ${errorMessage}"
                                String classMessage = "Error Class: ${errorClass}"
                                
                                echo failureMessage
                                echo classMessage
                                // 실패했더라도 Launch 상태를 STOPPED로 변경하는 것을 시도합니다.
                                try {
                                    // 💡 수정: Groovy Safe Navigation ?.를 사용하여 null 체크 (더 안전)
                                    def launchId = env.LAUNCH_ID?.trim() // Trim으로 안전하게 공백 제거
                                    
                                    if (launchId) { // null이거나 빈 문자열이 아닌 경우에만 실행
                                        withCredentials([string(credentialsId: 'slack-reportportal-token', variable: 'RP_TOKEN')]) {
                                            sh """
                                                echo "⚠️ 오류 발생 후 Launch ${launchId} 상태를 STOPPED로 강제 변경 시도..."
                                                export RP_ENDPOINT=http://10.10.0.30:8082/api/v1
                                                export RP_TOKEN=${RP_TOKEN}
                                                export RP_PROJECT=test_automation
                                                node scripts/get-rp-id.js update ${launchId} STOPPED
                                                echo "✅ 강제 STOPPED 처리 완료"
                                            """
                                        }
                                    } else {
                                        echo "⚠️ Launch ID가 유효하지 않아 STOPPED 처리를 건너뜁니다."
                                    }
                                } catch (Exception innerE) {
                                    // 안전한 에러 메시지 처리
                                    String stopErrorMessage = innerE.getMessage() ?: "Unknown error"
                                    echo "ReportPortal Launch 상태 강제 STOPPED 실패: ${stopErrorMessage}"
                                }
                            }
                            
                            // Allure 리포트 HTML 게시 및 아카이브
                            if (fileExists('allure-report')) {
                                publishHTML([
                                    allowMissing: false,
                                    alwaysLinkToLastBuild: false,
                                    keepAll: true,
                                    reportDir: 'allure-report',
                                    reportFiles: 'index.html',
                                    reportName: 'Allure Report'
                                ])
                            }
                            archiveArtifacts(
                                artifacts: 'allure-report/**/*',
                                fingerprint: true
                            )
                        }
                    }
                }
            }
        }
        
    }
    
    post {
        always {
            script {
                if (fileExists('test-results/results.json')) {
                    try {
                        def resultsJson = readJSON file: 'test-results/results.json'
                        def totalTests = 0
                        def passedTests = 0
                        def failedTests = 0
                        def skippedTests = 0
                        def failedTestList = []
                        
                        // suites 구조를 순회하면서 실제 테스트 결과를 집계 (ReportPortal 방식과 동일)
                        def suitesToProcess = []
                        if (resultsJson.containsKey('suites') && resultsJson.suites instanceof List) {
                            suitesToProcess.addAll(resultsJson.suites)
                        }
                        
                        // 통계 초기화
                        totalTests = 0
                        passedTests = 0
                        failedTests = 0
                        skippedTests = 0
                        failedTestList = []
                        
                        while (!suitesToProcess.isEmpty()) {
                            def currentSuite = suitesToProcess.remove(0)
                            
                            // 중첩된 suites 추가
                            if (currentSuite.containsKey('suites') && currentSuite.suites instanceof List) {
                                suitesToProcess.addAll(currentSuite.suites)
                            }
                            
                            // specs 처리 - 각 테스트의 실제 결과를 집계
                            if (currentSuite.containsKey('specs') && currentSuite.specs instanceof List) {
                                currentSuite.specs.each { spec ->
                                    if (spec.containsKey('tests') && spec.tests instanceof List) {
                                        spec.tests.each { test ->
                                            if (test.containsKey('results') && test.results instanceof List && test.results.size() > 0) {
                                                // 마지막 결과가 최종 상태 (retry 고려)
                                                def finalResult = test.results[test.results.size() - 1]
                                                if (finalResult != null) {
                                                    def resultStatus = finalResult.status ?: 'unknown'
                                                    def testTitle = spec.title ?: 'Unknown Test'
                                                    
                                                    // 총 테스트 수 증가
                                                    totalTests++
                                                    
                                                    // 상태별 카운트
                                                    if (resultStatus == 'passed') {
                                                        passedTests++
                                                    } else if (resultStatus == 'failed' || resultStatus == 'timedout' || resultStatus == 'interrupted') {
                                                        failedTests++
                                                        failedTestList.add("• ${testTitle} [${resultStatus.capitalize()}]")
                                                    } else if (resultStatus == 'skipped') {
                                                        skippedTests++
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        def testStatus = failedTests > 0 || skippedTests > 0 ? 'Fail' : 'Success'
                        def jenkinsUrl = 'http://10.10.0.159:8080'
                        def jobName = env.JOB_NAME ?: 'test_automation'
                        def buildNumber = env.BUILD_NUMBER ?: '1'
                        def playwrightReportUrl = "${jenkinsUrl}/job/${jobName}/${buildNumber}/Playwright_20Report/"
                        def reportPortalUrl = "http://10.10.0.30:8082/ui/#test_automation/launches/all"
                        
                        // 실패한 테스트 리스트 메시지 구성
                        def failureListMessage = ""
                        if (failedTestList.size() > 0) {
                            failureListMessage += "\n\n:warning: *Failed Tests:*\n${failedTestList.join('\n')}"
                        }
                        
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests}
📋 <${playwrightReportUrl}|Playwright Report>
📊 <${reportPortalUrl}|ReportPortal Dashboard>
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}${failureListMessage}"""
                        
                        slackSend(
                            channel: 'C07KHG2TS48',
                            color: testStatus == 'Success' ? 'good' : 'danger',
                            message: message,
                            tokenCredentialId: 'slack-api-token'
                        )
                    } catch (Exception e) {
                        echo "Slack 메시지 전송 실패: ${e.getMessage()}"
                    }
                }
            }
        }
    }
}
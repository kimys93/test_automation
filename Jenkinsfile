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
        GRAFANA_URL = "${env.GRAFANA_URL}"
        
        // DB 설정 (Jenkins 시스템 설정의 환경 변수에서 가져옴)
        DB_HOST = "${env.DB_HOST}"
        DB_PORT = "${env.DB_PORT}"
        DB_NAME = "${env.DB_NAME}"
        DB_USER = "${env.DB_USER}"
        DB_PASSWORD = "${env.DB_PASSWORD}"
        TEST_TYPE = "${env.TEST_TYPE}"
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT = "${env.GIT_COMMIT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                // GitLab 저장소에서 체크아웃 (Jenkins Credentials에 'gitlab-credentials' ID로 저장 필요)
                git url: 'http://gitlab.ngle.co.kr/platformqa/macaron/test_automation.git', 
                     branch: 'main',
                     credentialsId: 'gitlab-credentials'
            }
        }
        
        stage('Start Server') {
            steps {
                script {
                    def serverRunning = sh(
                        script: 'docker ps --filter "name=test-automation-server" --filter "status=running" --format "{{.Names}}" | grep -q "test-automation-server" && exit 0 || exit 1',
                        returnStatus: true
                    )
                    if (serverRunning != 0) {
                        sh 'docker compose up -d --build server'
                        sh 'sleep 20'
                    }
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
                sh 'npx playwright install'
            }
        }
        
        stage('Run Sanity Tests') {
            steps {
                script {
                    try {
                        sh 'npm run test:sanity'
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Process Test Results') {
            steps {
                script {
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
                }
            }
        }
        
    }
    
    post {
        always {
            script {
                if (fileExists('test-results/results.json')) {
                    try {
                        sh '''
                            export DB_HOST=${DB_HOST}
                            export DB_PORT=${DB_PORT}
                            export DB_NAME=${DB_NAME}
                            export DB_USER=${DB_USER}
                            export DB_PASSWORD=${DB_PASSWORD}
                            export BUILD_NUMBER=${BUILD_NUMBER}
                            export GIT_COMMIT=${GIT_COMMIT}
                            export TEST_TYPE=${TEST_TYPE}
                            node scripts/save-results-to-db.js
                        '''
                    } catch (Exception e) {
                        // DB 저장 실패 시 무시
                    }
                    
                    try {
                        def resultsJson = readJSON file: 'test-results/results.json'
                        def totalTests = 0
                        def passedTests = 0
                        def failedTests = 0
                        def skippedTests = 0
                        def nonPassedStepList = []  // Pass가 아닌 모든 상태의 step 리스트
                        def processedStepTitles = [:]  // 이미 처리한 depth2 step title을 추적 (중복 방지)
                        
                        if (resultsJson.containsKey('suites') && resultsJson.suites instanceof List) {
                            resultsJson.suites.each { suite ->
                                if (suite.containsKey('specs') && suite.specs instanceof List) {
                                    suite.specs.each { spec ->
                                        if (spec.containsKey('tests') && spec.tests instanceof List) {
                                            spec.tests.each { test ->
                                                if (test.containsKey('results') && test.results instanceof List) {
                                                    // result가 여러 개일 수 있으므로, 마지막 result만 사용 (최종 결과)
                                                    def finalResult = test.results[test.results.size() - 1]
                                                    if (finalResult != null) {
                                                        def resultStatus = finalResult.status ?: 'unknown'
                                                        
                                                        // depth2(중분류): result.steps[] 배열의 최상위 레벨 step들만 카운트
                                                        if (finalResult.containsKey('steps') && finalResult.steps instanceof List) {
                                                            finalResult.steps.each { depth2Step ->
                                                                def stepTitle = depth2Step.containsKey('title') ? depth2Step.title : ''
                                                                
                                                                // 이미 처리한 step이면 건너뛰기 (중복 방지)
                                                                if (stepTitle && processedStepTitles.containsKey(stepTitle)) {
                                                                    return
                                                                }
                                                                
                                                                // depth2만 카운트 (depth3는 depth2Step.steps가 있지만 카운트하지 않음)
                                                                totalTests++
                                                                processedStepTitles[stepTitle] = true
                                                                
                                                                // depth2 step 내부에 error가 있는지 확인 (depth3까지 확인)
                                                                def depth2StepHasError = false
                                                                
                                                                // depth2 step 자체에 error 필드가 있는지 확인
                                                                if (depth2Step.containsKey('error') && depth2Step.error != null) {
                                                                    depth2StepHasError = true
                                                                }
                                                                
                                                                // depth2 step의 하위 step들(depth3)을 반복문으로 확인하여 error가 있는지 찾기
                                                                // 재귀 호출 대신 반복문 사용 (Jenkins Sandbox 제한)
                                                                if (!depth2StepHasError && depth2Step.containsKey('steps') && depth2Step.steps instanceof List) {
                                                                    // depth3 step들 확인
                                                                    for (depth3Step in depth2Step.steps) {
                                                                        // depth3 step 자체에 error가 있는지 확인
                                                                        if (depth3Step.containsKey('error') && depth3Step.error != null) {
                                                                            depth2StepHasError = true
                                                                            break
                                                                        }
                                                                        // depth3 step의 하위 step들(depth4) 확인
                                                                        if (depth3Step.containsKey('steps') && depth3Step.steps instanceof List) {
                                                                            for (depth4Step in depth3Step.steps) {
                                                                                if (depth4Step.containsKey('error') && depth4Step.error != null) {
                                                                                    depth2StepHasError = true
                                                                                    break
                                                                                }
                                                                            }
                                                                            if (depth2StepHasError) {
                                                                                break
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                // result.errors 배열에서 해당 depth2 step과 관련된 에러가 있는지 확인
                                                                if (!depth2StepHasError && finalResult.containsKey('errors') && finalResult.errors instanceof List && finalResult.errors.size() > 0) {
                                                                    // result.errors에 에러가 있으면, 해당 depth2 step이 실패한 것으로 간주
                                                                    // (정확한 매칭은 어렵지만, result.status가 failed이고 errors가 있으면 depth2 step 중 하나는 실패)
                                                                    // 여기서는 depth2StepHasError가 false인 경우는 passed로 처리
                                                                }
                                                                
                                                                // depth2 step의 실제 실패 여부에 따라 처리
                                                                if (resultStatus == 'passed') {
                                                                    passedTests++
                                                                } else if (resultStatus == 'failed' || resultStatus == 'timedout' || resultStatus == 'interrupted') {
                                                                    // depth2 step에 실제로 error가 있는 경우만 실패로 처리
                                                                    if (depth2StepHasError) {
                                                                        failedTests++
                                                                        if (stepTitle) {
                                                                            def statusLabel = resultStatus == 'failed' ? 'Failed' :
                                                                                             resultStatus == 'timedout' ? 'Timedout' :
                                                                                             resultStatus == 'interrupted' ? 'Interrupted' :
                                                                                             resultStatus.capitalize()
                                                                            nonPassedStepList.add("• ${stepTitle} [${statusLabel}]")
                                                                        }
                                                                    } else {
                                                                        // depth2 step에 error가 없으면 passed로 처리
                                                                        passedTests++
                                                                    }
                                                                } else if (resultStatus == 'skipped') {
                                                                    skippedTests++
                                                                    if (stepTitle) {
                                                                        nonPassedStepList.add("• ${stepTitle} [Skipped]")
                                                                    }
                                                                } else {
                                                                    // 기타 상태
                                                                    if (depth2StepHasError) {
                                                                        failedTests++
                                                                        if (stepTitle) {
                                                                            nonPassedStepList.add("• ${stepTitle} [${resultStatus.capitalize()}]")
                                                                        }
                                                                    } else {
                                                                        passedTests++
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        def testStatus = failedTests > 0 || skippedTests > 0 ? 'Fail' : 'Success'
                        // Grafana 대시보드 URL 설정 (Jenkins 환경 변수에서 가져옴)
                        def grafanaUrl = env.GRAFANA_URL
                        // Playwright Report URL 설정 (Jenkins HTML Publisher 플러그인으로 생성된 리포트)
                        def jenkinsUrl = env.JENKINS_URL
                        def jobName = env.JOB_NAME ?: 'test_automation'
                        def buildNumber = env.BUILD_NUMBER ?: '1'
                        def playwrightReportUrl = "${jenkinsUrl}/job/${jobName}/${buildNumber}/Playwright_20Report/"
                        
                        // Pass가 아닌 모든 결과 리스트 메시지 구성
                        def failureListMessage = ""
                        if (nonPassedStepList.size() > 0) {
                            failureListMessage += "\n\n:warning: *Non-Passed Tests:*\n${nonPassedStepList.join('\n')}"
                        }
                        
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests}
📊 <${grafanaUrl}|Grafana Dashboard> | 📋 <${playwrightReportUrl}|Playwright Report>
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}${failureListMessage}"""
                        
                        slackSend(
                            channel: 'C07KHG2TS48',
                            color: testStatus == 'Success' ? 'good' : 'danger',
                            message: message,
                            tokenCredentialId: 'slack-token'
                        )
                    } catch (Exception e) {
                        // Slack 알림 실패 시 무시
                    }
                }
            }
        }
    }
}






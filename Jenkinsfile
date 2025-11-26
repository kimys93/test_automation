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
                                export RP_TOKEN=\$RP_TOKEN
                                export RP_PROJECT=test_automation
                                export RP_LAUNCH=test-run-${BUILD_NUMBER}
                                export RP_DEBUG=false
                                export TEST_TYPE=sanity
                                export BUILD_NUMBER=${BUILD_NUMBER}
                                export BASE_URL=http://10.10.0.159:8000
                                npm run test:sanity
                            """
                        }
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
    }
    
    post {
        always {
            // Allure Plugin으로 리포트 자동 생성
            allure([
                results: [[path: "allure-results"]],
                reportBuildPolicy: 'ALWAYS'
            ])
            
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
                        // Allure Plugin이 생성한 리포트 URL (CSP 문제 없음)
                        def allureReportUrl = "${jenkinsUrl}/job/${jobName}/${buildNumber}/allure/"
                        def reportPortalUrl = "http://10.10.0.30:8082/ui/#test_automation/launches/all"
                        
                        // 실패한 테스트 리스트 메시지 구성
                        def failureListMessage = ""
                        if (failedTestList.size() > 0) {
                            failureListMessage += "\n\n:warning: *Failed Tests:*\n${failedTestList.join('\n')}"
                        }
                        
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests}
📊 <${allureReportUrl}|Allure Report>
🔍 <${reportPortalUrl}|ReportPortal Dashboard>
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
pipeline {
    agent any
    
    tools {
        nodejs 'Node20'
    }
    
    environment {
        PATH = "/usr/bin:/bin:/usr/sbin:/sbin:${env.PATH}"
        // Jenkins URL 환경 변수 (Jenkins 시스템 설정에서 전역 환경 변수로 설정 필요)
        // Jenkins 관리 → 시스템 설정 → Global properties → Environment variables
        // Name: JENKINS_URL, Value: http://IP 주소:포트
    }
    
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/kimys93/test_automation.git', branch: 'main'
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
                        echo "테스트 실행 중 오류 발생: ${e.message}"
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
                        def resultsJson = readJSON file: 'test-results/results.json'
                        def totalTests = 0
                        def passedTests = 0
                        def failedTests = 0
                        def skippedTests = 0
                        def nonPassedStepList = []  // Pass가 아닌 모든 상태의 step 리스트
                        
                        if (resultsJson.containsKey('suites') && resultsJson.suites instanceof List) {
                            resultsJson.suites.each { suite ->
                                if (suite.containsKey('specs') && suite.specs instanceof List) {
                                    suite.specs.each { spec ->
                                        if (spec.containsKey('tests') && spec.tests instanceof List) {
                                            spec.tests.each { test ->
                                                if (test.containsKey('results') && test.results instanceof List) {
                                                    test.results.each { result ->
                                                        // 중분류: result.steps[] 배열의 최상위 레벨 step들만 카운트
                                                        if (result.containsKey('steps') && result.steps instanceof List) {
                                                            result.steps.each { step ->
                                                                // 중분류만 카운트 (소분류는 step.steps가 있지만 카운트하지 않음)
                                                                totalTests++
                                                                
                                                                // 상위 테스트의 status를 기준으로 판단
                                                                def status = result.status ?: 'unknown'
                                                                
                                                                if (status == 'passed') {
                                                                    passedTests++
                                                                } else {
                                                                    // Pass가 아닌 모든 상태 처리
                                                                    if (status == 'failed' || status == 'timedout' || status == 'interrupted') {
                                                                        failedTests++
                                                                    } else if (status == 'skipped') {
                                                                        skippedTests++
                                                                    } else {
                                                                        // 기타 알 수 없는 상태도 실패로 처리
                                                                        failedTests++
                                                                    }
                                                                    
                                                                    // Pass가 아닌 중분류 step의 title과 상태 수집
                                                                    if (step.containsKey('title')) {
                                                                        def statusLabel = status == 'skipped' ? 'Skipped' : 
                                                                                         status == 'failed' ? 'Failed' :
                                                                                         status == 'timedout' ? 'Timedout' :
                                                                                         status == 'interrupted' ? 'Interrupted' :
                                                                                         status.capitalize()
                                                                        nonPassedStepList.add("• ${step.title} [${statusLabel}]")
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
                        // 외부 접속을 위해 환경 변수에서 Jenkins URL 가져오기
                        // Jenkins 시스템 설정에서 JENKINS_URL 환경 변수 설정 필요
                        def jenkinsBaseUrl = env.JENKINS_URL
                        if (!jenkinsBaseUrl) {
                            echo "경고: JENKINS_URL 환경 변수가 설정되지 않았습니다. Jenkins 시스템 설정에서 설정하세요."
                            // JOB_URL에서 기본 URL 추출 (fallback)
                            jenkinsBaseUrl = env.JOB_URL ? env.JOB_URL.replaceAll('/job/.*', '') : null
                        }
                        def jobName = env.JOB_NAME ?: 'test_automation'
                        def artifactUrl = "${jenkinsBaseUrl}/job/${jobName}/lastBuild/artifact/playwright-report/index.html"
                        
                        // Pass가 아닌 모든 결과 리스트 메시지 구성
                        def failureListMessage = ""
                        if (nonPassedStepList.size() > 0) {
                            failureListMessage += "\n\n:warning: *Non-Passed Tests:*\n${nonPassedStepList.join('\n')}"
                        }
                        
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests} - (<${artifactUrl}|Open>)
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}${failureListMessage}"""
                        
                        slackSend(
                            channel: 'C07KHG2TS48',
                            color: testStatus == 'Success' ? 'good' : 'danger',
                            message: message,
                            tokenCredentialId: 'slack-token'
                        )
                    } catch (Exception e) {
                        echo "Could not send Slack notification: ${e.message}"
                    }
                }
            }
        }
    }
}






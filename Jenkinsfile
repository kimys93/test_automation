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
                                                        def resultStatus = result.status ?: 'unknown'
                                                        
                                                        // depth2(중분류): result.steps[] 배열의 최상위 레벨 step들만 카운트
                                                        if (result.containsKey('steps') && result.steps instanceof List) {
                                                            result.steps.each { depth2Step ->
                                                                // depth2만 카운트 (depth3는 depth2Step.steps가 있지만 카운트하지 않음)
                                                                totalTests++
                                                                
                                                                // depth2 step 내부에 error가 있는지 확인 (depth3까지 재귀적으로 확인)
                                                                def depth2StepHasError = false
                                                                
                                                                // depth2 step 자체에 error 필드가 있는지 확인
                                                                if (depth2Step.containsKey('error') && depth2Step.error != null) {
                                                                    depth2StepHasError = true
                                                                }
                                                                
                                                                // depth2 step의 하위 step들(depth3)을 재귀적으로 확인하여 error가 있는지 찾기
                                                                def checkStepForError = { s ->
                                                                    // step 자체에 error가 있는지 확인
                                                                    if (s.containsKey('error') && s.error != null) {
                                                                        return true
                                                                    }
                                                                    // 하위 step들을 확인
                                                                    if (s.containsKey('steps') && s.steps instanceof List) {
                                                                        for (subStep in s.steps) {
                                                                            if (checkStepForError(subStep)) {
                                                                                return true
                                                                            }
                                                                        }
                                                                    }
                                                                    return false
                                                                }
                                                                
                                                                // depth2 step의 하위 step들(depth3)에서 error 확인
                                                                if (!depth2StepHasError && depth2Step.containsKey('steps') && depth2Step.steps instanceof List) {
                                                                    depth2StepHasError = checkStepForError(depth2Step)
                                                                }
                                                                
                                                                // result.errors 배열에서 해당 depth2 step과 관련된 에러가 있는지 확인
                                                                if (!depth2StepHasError && result.containsKey('errors') && result.errors instanceof List && result.errors.size() > 0) {
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
                                                                        if (depth2Step.containsKey('title')) {
                                                                            def statusLabel = resultStatus == 'failed' ? 'Failed' :
                                                                                             resultStatus == 'timedout' ? 'Timedout' :
                                                                                             resultStatus == 'interrupted' ? 'Interrupted' :
                                                                                             resultStatus.capitalize()
                                                                            nonPassedStepList.add("• ${depth2Step.title} [${statusLabel}]")
                                                                        }
                                                                    } else {
                                                                        // depth2 step에 error가 없으면 passed로 처리
                                                                        passedTests++
                                                                    }
                                                                } else if (resultStatus == 'skipped') {
                                                                    skippedTests++
                                                                    if (depth2Step.containsKey('title')) {
                                                                        nonPassedStepList.add("• ${depth2Step.title} [Skipped]")
                                                                    }
                                                                } else {
                                                                    // 기타 상태
                                                                    if (depth2StepHasError) {
                                                                        failedTests++
                                                                        if (depth2Step.containsKey('title')) {
                                                                            nonPassedStepList.add("• ${depth2Step.title} [${resultStatus.capitalize()}]")
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






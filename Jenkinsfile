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
                        
                        if (resultsJson.containsKey('stats') && resultsJson.stats instanceof Map) {
                            def stats = resultsJson.stats
                            def expected = stats.containsKey('expected') ? stats.expected : 0
                            def unexpected = stats.containsKey('unexpected') ? stats.unexpected : 0
                            
                            totalTests = expected + unexpected
                            passedTests = expected
                            failedTests = unexpected
                        }
                        
                        def testStatus = failedTests > 0 ? 'Fail' : 'Success'
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
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests} - (<${artifactUrl}|Open>)
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}"""
                        
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






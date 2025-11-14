pipeline {
    agent any
    
    tools {
        nodejs 'Node20'
    }
    
    environment {
        PATH = "/usr/bin:/bin:/usr/sbin:/sbin:${env.PATH}"
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
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
                        
                        if (resultsJson.containsKey('stats') && resultsJson.stats instanceof Map) {
                            def stats = resultsJson.stats
                            def expected = stats.containsKey('expected') ? stats.expected : 0
                            def unexpected = stats.containsKey('unexpected') ? stats.unexpected : 0
                            skippedTests = stats.containsKey('skipped') ? stats.skipped : 0
                            def flaky = stats.containsKey('flaky') ? stats.flaky : 0
                            
                            totalTests = expected + unexpected + skippedTests + flaky
                            passedTests = expected
                            failedTests = unexpected
                        }
                        
                        def testStatus = failedTests > 0 ? 'Fail' : 'Success'
                        def artifactUrl = "${env.JOB_URL}lastBuild/artifact/playwright-report/index.html"
                        def message = """Test Status:
Total Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests} - (<${artifactUrl}|Open>)
${testStatus == 'Success' ? '\n:white_check_mark: Success - 모든 테스트 성공' : '\n:red_circle: Fail - 실패한 케이스 확인 필요'}"""
                        
                        slackSend(
                            channel: '#ngle-전체',
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






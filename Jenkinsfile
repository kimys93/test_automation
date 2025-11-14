pipeline {
    agent any
    
    environment {
        JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8'
        PYTHONIOENCODING = 'UTF-8'
        LANG = 'ko_KR.UTF-8'
        LC_ALL = 'ko_KR.UTF-8'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }
        
        stage('Setup Node.js') {
            steps {
                script {
                    echo 'Setting up Node.js...'
                    def nodejs = tool 'NodeJS'
                    env.PATH = "${nodejs};${env.PATH}"
                    bat 'node --version'
                    bat 'npm --version'
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    if (fileExists('node_modules')) {
                        echo 'node_modules already exists, skipping npm install'
                    } else {
                        echo 'Installing npm dependencies...'
                        bat 'npm install'
                    }
                }
            }
        }
        
        stage('Install Playwright Browsers') {
            steps {
                script {
                    def chromiumInstalled = false
                    try {
                        def result = bat(
                            script: '@echo off && dir /b "%LOCALAPPDATA%\\ms-playwright" 2>nul | findstr /i "chromium" >nul && echo exists || echo not_exists',
                            returnStdout: true
                        ).trim()
                        chromiumInstalled = result.contains('exists')
                    } catch (Exception e) {
                        // 확인 실패 시 설치 진행
                    }
                    
                    if (chromiumInstalled || fileExists('node_modules\\.cache\\playwright')) {
                        echo 'Playwright browsers already installed, skipping installation'
                    } else {
                        echo 'Installing Playwright browsers...'
                        bat 'npx playwright install'
                    }
                }
            }
        }
        
        stage('Run Sanity Tests') {
            steps {
                script {
                    echo 'Running Sanity tests...'
                    def testExitCode = bat(
                        script: 'npm run test:sanity',
                        returnStatus: true
                    )
                    
                    if (testExitCode != 0) {
                        currentBuild.result = 'UNSTABLE'
                        echo "Tests failed with exit code: ${testExitCode}"
                    } else {
                        echo 'All tests passed'
                    }
                }
            }
            post {
                always {
                    script {
                        echo 'Publishing test results...'
                        if (fileExists('playwright-report/index.html')) {
                            publishHTML([
                                reportDir: 'playwright-report',
                                reportFiles: 'index.html',
                                reportName: 'Playwright Test Report'
                            ])
                            echo 'Playwright HTML report published'
                        }
                        
                        if (fileExists('playwright-report')) {
                            archiveArtifacts(
                                artifacts: 'playwright-report/**/*',
                                allowEmptyArchive: true
                            )
                        }
                        
                        if (fileExists('test-results/results.json')) {
                            archiveArtifacts(
                                artifacts: 'test-results/results.json',
                                allowEmptyArchive: true
                            )
                        }
                        
                        if (fileExists('test-results')) {
                            archiveArtifacts(
                                artifacts: 'test-results/**/*',
                                allowEmptyArchive: true
                            )
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Build completed'
            script {
                if (fileExists('test-results/results.json')) {
                    try {
                        echo 'Parsing test results and sending Slack notification...'
                        def resultsJson = readJSON file: 'test-results/results.json'
                        
                        def totalTests = 0
                        def passedTests = 0
                        def failedTests = 0
                        def skippedTests = 0
                        
                        if (resultsJson.containsKey('stats') && resultsJson.stats instanceof Map) {
                            def stats = resultsJson.stats
                            def expected = stats.containsKey('expected') && stats.expected instanceof Number ? stats.expected : 0
                            def unexpected = stats.containsKey('unexpected') && stats.unexpected instanceof Number ? stats.unexpected : 0
                            skippedTests = stats.containsKey('skipped') && stats.skipped instanceof Number ? stats.skipped : 0
                            def flaky = stats.containsKey('flaky') && stats.flaky instanceof Number ? stats.flaky : 0
                            
                            totalTests = expected + unexpected + skippedTests + flaky
                            passedTests = expected
                            failedTests = unexpected
                        }
                        
                        def testJobUrl = "${env.JENKINS_URL}job/${env.JOB_NAME}/"
                        def buildUrl = env.BUILD_URL ?: 'N/A'
                        def status = failedTests > 0 ? 'FAILED' : 'PASSED'
                        def color = failedTests > 0 ? 'danger' : 'good'
                        
                        def message = """테스트 자동화 결과: ${status}

테스트 요약:
• 전체: ${totalTests}
• Passed: ${passedTests}
• Failed: ${failedTests}
• Skipped: ${skippedTests}

링크:
• 테스트 리포트: ${testJobUrl}
• 빌드: ${buildUrl}"""
                        
                        slackSend(
                            channel: '#test-automation',
                            color: color,
                            message: message,
                            tokenCredentialId: 'slack-token'
                        )
                        echo 'Slack notification sent successfully'
                    } catch (Exception e) {
                        echo "Could not send Slack notification: ${e.message}"
                    }
                }
            }
        }
        success {
            echo 'Build succeeded!'
        }
        failure {
            echo 'Build failed!'
        }
        unstable {
            echo 'Build unstable (tests failed)!'
        }
    }
}






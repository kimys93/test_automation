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
                    def nodejs = tool 'NodeJS'
                    env.PATH = "${nodejs};${env.PATH}"
                    bat 'node --version'
                    bat 'npm --version'
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                bat 'npm install'
            }
        }
        
        stage('Install Playwright Browsers') {
            steps {
                echo 'Installing Playwright browsers...'
                bat 'npx playwright install'
            }
        }
        
        stage('Run Sanity Tests') {
            steps {
                echo 'Running Sanity tests...'
                script {
                    def testExitCode = bat(
                        script: 'npm run test:sanity',
                        returnStatus: true
                    )
                    
                    if (testExitCode != 0) {
                        currentBuild.result = 'UNSTABLE'
                        echo "Tests failed with exit code: ${testExitCode}"
                    }
                }
            }
            post {
                always {
                    echo 'Publishing test results...'
                    script {
                        if (fileExists('playwright-report/index.html')) {
                            publishHTML([
                                reportDir: 'playwright-report',
                                reportFiles: 'index.html',
                                reportName: 'Playwright Test Report'
                            ])
                            echo 'Playwright HTML report published successfully'
                        } else {
                            echo 'Warning: Playwright report not found'
                            bat 'dir playwright-report\\ 2>nul || echo Directory does not exist'
                        }
                        
                        if (fileExists('playwright-report')) {
                            archiveArtifacts(
                                artifacts: 'playwright-report/**/*',
                                allowEmptyArchive: true
                            )
                        }
                        
                        // 테스트 결과 JSON 파일 보관 (Slack 전송용)
                        if (fileExists('test-results/results.json')) {
                            archiveArtifacts(
                                artifacts: 'test-results/results.json',
                                allowEmptyArchive: true
                            )
                            echo 'Test results JSON saved for Slack notification'
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
            echo 'Build completed. Check the Playwright Test Report link in the build sidebar.'
            
            // 테스트 결과가 있으면 Slack 알림 파이프라인 트리거 (선택적)
            script {
                if (fileExists('test-results/results.json')) {
                    echo 'Triggering Slack notification pipeline...'
                    try {
                        build job: 'test_automation_slack', 
                              parameters: [
                                  string(name: 'BUILD_NUMBER', value: "${env.BUILD_NUMBER}")
                              ],
                              wait: false,
                              propagate: false
                        echo 'Slack notification pipeline triggered'
                    } catch (Exception e) {
                        echo "Could not trigger Slack notification: ${e.message}"
                        echo 'You can manually run test_automation_slack job to send notification'
                    }
                }
            }
        }
        success {
            echo 'Build succeeded!'
        }
        failure {
            echo 'Build failed! Check the test report for details.'
        }
        unstable {
            echo 'Build unstable (tests failed but report published)! Check the test report for details.'
        }
    }
}


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
                bat 'npx playwright install --with-deps chromium'
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


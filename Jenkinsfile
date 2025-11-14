pipeline {
    agent any
    
    environment {
        JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
        PYTHONIOENCODING = 'UTF-8'
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
                    // chromium 브라우저가 설치되어 있는지 확인
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
                echo 'Running Sanity tests...'
                bat 'chcp 65001 >nul && npm run test:sanity'
            }
            post {
                always {
                    echo 'Publishing test results...'
                    publishHTML([
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Test Report',
                        keepAll: true
                    ])
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up...'
            cleanWs()
        }
        success {
            echo 'Build succeeded!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}


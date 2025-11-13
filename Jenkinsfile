pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                script {
                    if (isUnix()) {
                        sh 'npm install'
                    } else {
                        bat 'npm install'
                    }
                }
            }
        }
        
        stage('Install Playwright Browsers') {
            steps {
                echo 'Installing Playwright browsers...'
                script {
                    if (isUnix()) {
                        sh 'npx playwright install --with-deps chromium'
                    } else {
                        bat 'npx playwright install --with-deps chromium'
                    }
                }
            }
        }
        
        stage('Run Sanity Tests') {
            steps {
                echo 'Running Sanity tests...'
                script {
                    if (isUnix()) {
                        sh 'npm run test:sanity'
                    } else {
                        bat 'npm run test:sanity'
                    }
                }
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


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
        
        // DB 설정 (Jenkins 시스템 설정의 환경 변수에서 가져옴)
        DB_HOST = "${env.DB_HOST}"
        DB_PORT = "${env.DB_PORT}"
        DB_NAME = "${env.DB_NAME}"
        DB_USER = "${env.DB_USER}"
        DB_PASSWORD = "${env.DB_PASSWORD}"
        TEST_TYPE = "${env.TEST_TYPE}"
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT = "${env.GIT_COMMIT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/kimys93/test_automation.git', branch: 'main'
            }
        }
        
        stage('Start Server') {
            steps {
                script {
                    echo '🐘 통합 서버(PostgreSQL + Allure) 컨테이너 상태 확인 중...'
                    // 통합 서버 컨테이너가 실행 중인지 확인
                    def serverRunning = sh(
                        script: 'docker ps --filter "name=test-automation-server" --filter "status=running" --format "{{.Names}}" | grep -q "test-automation-server" && exit 0 || exit 1',
                        returnStatus: true
                    )
                    
                    if (serverRunning == 0) {
                        echo '✅ 통합 서버가 이미 실행 중입니다.'
                        // 기존 서버가 실행 중이어도 스키마 확인
                        echo '🔍 DB 스키마 확인 중...'
                        try {
                            def schemaCheck = sh(
                                script: "docker exec test-automation-server bash -c 'export PGPASSWORD=postgres && psql -h localhost -U postgres -d test_automation -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\'public\\';\"'",
                                returnStatus: true
                            )
                            if (schemaCheck != 0) {
                                echo '⚠️ 스키마가 없습니다. 스키마 초기화 중...'
                                sh 'docker exec test-automation-server bash -c "export PGPASSWORD=postgres && psql -h localhost -U postgres -d test_automation -f /workspace/database/schema.sql"'
                                echo '✅ 스키마 초기화 완료'
                            } else {
                                echo '✅ 스키마 확인 완료'
                            }
                        } catch (Exception e) {
                            echo "⚠️ 스키마 확인 중 오류: ${e.message}"
                        }
                    } else {
                        echo '🚀 통합 서버 시작 중...'
                        try {
                            // docker-compose로 통합 서버 시작 (재빌드 포함)
                            sh 'docker-compose up -d --build server'
                            // 서버가 준비될 때까지 대기 (PostgreSQL 초기화 시간 고려)
                            sh 'sleep 20'
                            echo '✅ 통합 서버 시작 완료'
                            
                            // 스키마가 제대로 초기화되었는지 확인
                            echo '🔍 DB 스키마 확인 중...'
                            sh 'sleep 5'
                            def tableCount = sh(
                                script: "docker exec test-automation-server bash -c 'export PGPASSWORD=postgres && psql -h localhost -U postgres -d test_automation -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\'public\\';\"'",
                                returnStatus: true
                            )
                            if (tableCount != 0) {
                                echo '⚠️ 스키마가 없습니다. 스키마 초기화 중...'
                                sh 'docker exec test-automation-server bash -c "export PGPASSWORD=postgres && psql -h localhost -U postgres -d test_automation -f /workspace/database/schema.sql"'
                                echo '✅ 스키마 초기화 완료'
                            } else {
                                echo '✅ 스키마 확인 완료'
                            }
                        } catch (Exception e) {
                            echo "⚠️ 통합 서버 시작 중 오류 발생: ${e.message}"
                            echo "⚠️ 기존 서버를 사용합니다 (DB_HOST 환경 변수 확인 필요)"
                        }
                    }
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    // CI 환경에서는 항상 npm install 실행 (의존성 동기화 보장)
                    echo 'Installing dependencies...'
                    sh 'npm install'
                    
                    // playwright가 설치되어 있지 않으면 설치
                    def playwrightExists = sh(
                        script: 'test -d node_modules/@playwright/test && exit 0 || exit 1',
                        returnStatus: true
                    )
                    if (playwrightExists != 0) {
                        echo 'Playwright not found, running npx playwright install...'
                        sh 'npx playwright install'
                    } else {
                        echo 'Playwright already installed, skipping installation'
                    }
                }
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
        
        stage('Save Test Results to DB') {
            when {
                expression { 
                    return fileExists('allure-results') && env.DB_HOST
                }
            }
            steps {
                script {
                    echo '💾 테스트 결과를 DB에 저장 중...'
                    try {
                        sh 'npm run allure:save-db'
                        echo '✅ DB 저장 완료'
                    } catch (Exception e) {
                        echo "❌ DB 저장 중 오류 발생: ${e.message}"
                        // DB 저장 실패해도 빌드는 계속 진행
                        currentBuild.result = currentBuild.result ?: 'UNSTABLE'
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                if (fileExists('test-results/results.json')) {
                    // results.json을 DB에 저장
                    try {
                        // pg 패키지 확인
                        def pgExists = sh(
                            script: 'test -d node_modules/pg && exit 0 || exit 1',
                            returnStatus: true
                        )
                        if (pgExists != 0) {
                            echo "⚠️ pg package not found, running npm install..."
                            sh 'npm install'
                        }
                        
                        // Jenkins에서 설정한 환경 변수 그대로 사용
                        sh '''
                            export DB_HOST=${DB_HOST}
                            export DB_PORT=${DB_PORT}
                            export DB_NAME=${DB_NAME}
                            export DB_USER=${DB_USER}
                            export DB_PASSWORD=${DB_PASSWORD}
                            export BUILD_NUMBER=${BUILD_NUMBER}
                            export GIT_COMMIT=${GIT_COMMIT}
                            export TEST_TYPE=${TEST_TYPE}
                            node scripts/save-results-to-db.js
                        '''
                        echo "✅ Test results saved to database"
                    } catch (Exception e) {
                        echo "⚠️ Could not save to database: ${e.message}"
                        echo "⚠️ Make sure PostgreSQL is running and accessible at ${env.DB_HOST ?: 'localhost'}:${env.DB_PORT ?: '5432'}"
                    }
                    
                    // Allure 결과를 영구 저장소에 저장
                    if (fileExists('allure-results')) {
                        try {
                            sh '''
                                export ALLURE_RESULTS_PERMANENT=${ALLURE_RESULTS_PERMANENT:-./allure-results-permanent}
                                node scripts/save-allure-results.js
                            '''
                            echo "✅ Allure results saved to permanent storage"
                        } catch (Exception e) {
                            echo "⚠️ Could not save Allure results: ${e.message}"
                        }
                    } else {
                        echo "⚠️ allure-results directory not found, skipping Allure results permanent storage."
                    }
                    
                    try {
                        def resultsJson = readJSON file: 'test-results/results.json'
                        def totalTests = 0
                        def passedTests = 0
                        def failedTests = 0
                        def skippedTests = 0
                        def nonPassedStepList = []  // Pass가 아닌 모든 상태의 step 리스트
                        def processedStepTitles = [:]  // 이미 처리한 depth2 step title을 추적 (중복 방지)
                        
                        if (resultsJson.containsKey('suites') && resultsJson.suites instanceof List) {
                            resultsJson.suites.each { suite ->
                                if (suite.containsKey('specs') && suite.specs instanceof List) {
                                    suite.specs.each { spec ->
                                        if (spec.containsKey('tests') && spec.tests instanceof List) {
                                            spec.tests.each { test ->
                                                if (test.containsKey('results') && test.results instanceof List) {
                                                    // result가 여러 개일 수 있으므로, 마지막 result만 사용 (최종 결과)
                                                    def finalResult = test.results[test.results.size() - 1]
                                                    if (finalResult != null) {
                                                        def resultStatus = finalResult.status ?: 'unknown'
                                                        
                                                        // depth2(중분류): result.steps[] 배열의 최상위 레벨 step들만 카운트
                                                        if (finalResult.containsKey('steps') && finalResult.steps instanceof List) {
                                                            finalResult.steps.each { depth2Step ->
                                                                def stepTitle = depth2Step.containsKey('title') ? depth2Step.title : ''
                                                                
                                                                // 이미 처리한 step이면 건너뛰기 (중복 방지)
                                                                if (stepTitle && processedStepTitles.containsKey(stepTitle)) {
                                                                    return
                                                                }
                                                                
                                                                // depth2만 카운트 (depth3는 depth2Step.steps가 있지만 카운트하지 않음)
                                                                totalTests++
                                                                processedStepTitles[stepTitle] = true
                                                                
                                                                // depth2 step 내부에 error가 있는지 확인 (depth3까지 확인)
                                                                def depth2StepHasError = false
                                                                
                                                                // depth2 step 자체에 error 필드가 있는지 확인
                                                                if (depth2Step.containsKey('error') && depth2Step.error != null) {
                                                                    depth2StepHasError = true
                                                                }
                                                                
                                                                // depth2 step의 하위 step들(depth3)을 반복문으로 확인하여 error가 있는지 찾기
                                                                // 재귀 호출 대신 반복문 사용 (Jenkins Sandbox 제한)
                                                                if (!depth2StepHasError && depth2Step.containsKey('steps') && depth2Step.steps instanceof List) {
                                                                    // depth3 step들 확인
                                                                    for (depth3Step in depth2Step.steps) {
                                                                        // depth3 step 자체에 error가 있는지 확인
                                                                        if (depth3Step.containsKey('error') && depth3Step.error != null) {
                                                                            depth2StepHasError = true
                                                                            break
                                                                        }
                                                                        // depth3 step의 하위 step들(depth4) 확인
                                                                        if (depth3Step.containsKey('steps') && depth3Step.steps instanceof List) {
                                                                            for (depth4Step in depth3Step.steps) {
                                                                                if (depth4Step.containsKey('error') && depth4Step.error != null) {
                                                                                    depth2StepHasError = true
                                                                                    break
                                                                                }
                                                                            }
                                                                            if (depth2StepHasError) {
                                                                                break
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                
                                                                // result.errors 배열에서 해당 depth2 step과 관련된 에러가 있는지 확인
                                                                if (!depth2StepHasError && finalResult.containsKey('errors') && finalResult.errors instanceof List && finalResult.errors.size() > 0) {
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
                                                                        if (stepTitle) {
                                                                            def statusLabel = resultStatus == 'failed' ? 'Failed' :
                                                                                             resultStatus == 'timedout' ? 'Timedout' :
                                                                                             resultStatus == 'interrupted' ? 'Interrupted' :
                                                                                             resultStatus.capitalize()
                                                                            nonPassedStepList.add("• ${stepTitle} [${statusLabel}]")
                                                                        }
                                                                    } else {
                                                                        // depth2 step에 error가 없으면 passed로 처리
                                                                        passedTests++
                                                                    }
                                                                } else if (resultStatus == 'skipped') {
                                                                    skippedTests++
                                                                    if (stepTitle) {
                                                                        nonPassedStepList.add("• ${stepTitle} [Skipped]")
                                                                    }
                                                                } else {
                                                                    // 기타 상태
                                                                    if (depth2StepHasError) {
                                                                        failedTests++
                                                                        if (stepTitle) {
                                                                            nonPassedStepList.add("• ${stepTitle} [${resultStatus.capitalize()}]")
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
                        // Allure 서버 URL 설정
                        // 환경 변수 ALLURE_SERVER_URL이 설정되어 있으면 사용, 없으면 기본값 사용
                        def allureServerUrl = env.ALLURE_SERVER_URL ?: 'http://localhost:5050'
                        def artifactUrl = "${allureServerUrl}"
                        
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






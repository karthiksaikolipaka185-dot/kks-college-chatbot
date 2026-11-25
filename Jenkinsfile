pipeline {
    agent any

    options {
        skipDefaultCheckout()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timestamps()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_APPLICATION',
            defaultValue: false,
            description: 'Deploy updated Docker Compose stack on main branch (leave false for CI-only builds).'
        )
    }

    environment {
        COMPOSE_PROJECT_NAME = 'kks-college-chatbot'
        APP_URL              = 'http://localhost:3000'
        NEWMAN_VERSION       = '6.2.3'
        MIN_FREE_DISK_GB     = '20'
    }

    stages {
        stage('Environment Check') {
            steps {
                bat '''
                    @echo off
                    echo ========================================================
                    echo [INFO] Auditing Jenkins Windows Execution Environment
                    echo ========================================================

                    echo [Operating System]
                    ver

                    echo.
                    echo [Git Version]
                    where git >nul 2>nul
                    if %ERRORLEVEL% neq 0 (
                        echo [ERROR] Git is not accessible in PATH!
                        exit /b 1
                    )
                    git --version

                    echo.
                    echo [Node.js Version]
                    where node >nul 2>nul
                    if %ERRORLEVEL% neq 0 (
                        echo [ERROR] Node.js is not accessible in PATH!
                        exit /b 1
                    )
                    node -v

                    echo.
                    echo [npm Version]
                    where npm >nul 2>nul
                    if %ERRORLEVEL% neq 0 (
                        echo [ERROR] npm is not accessible in PATH!
                        exit /b 1
                    )
                    call npm -v

                    echo.
                    echo [Disk Space Preflight]
                    powershell -NoProfile -Command "$free = [math]::Round((Get-PSDrive C).Free / 1GB, 2); Write-Host ('C: Free Space = ' + $free + ' GB'); if ('%DEPLOY_APPLICATION%' -eq 'true' -and $free -lt [double]'%MIN_FREE_DISK_GB%') { Write-Error ('Insufficient disk space for deployment: ' + $free + ' GB < %MIN_FREE_DISK_GB% GB'); exit 1 }"
                    if errorlevel 1 exit /b 1

                    echo ========================================================
                    echo [SUCCESS] Environment check passed.
                    echo ========================================================
                '''
            }
        }

        stage('Checkout') {
            steps {
                echo '[INFO] Checking out source code from configured SCM repository...'
                checkout scm
                script {
                    env.GIT_SHORT_SHA = bat(script: '@git rev-parse --short HEAD', returnStdout: true).trim()
                    env.RELEASE_TAG = "build-${env.BUILD_NUMBER}-${env.GIT_SHORT_SHA}"
                    env.DEPLOYMENT_STARTED = 'false'
                    env.ROLLBACK_READY = 'false'
                    def isMainAncestor = bat(
                        script: '@git merge-base --is-ancestor HEAD origin/main 2>nul && echo true || echo false',
                        returnStdout: true
                    ).trim()
                    env.IS_MAIN_ANCESTOR = isMainAncestor
                    echo "[INFO] Commit SHA: ${env.GIT_SHORT_SHA} | Branch: ${env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'unknown'} | MainAncestor: ${env.IS_MAIN_ANCESTOR}"
                }
            }
        }

        stage('Frontend Installation') {
            steps {
                dir('client/KKS-platform') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        echo [INFO] Installing frontend dependencies via npm ci...
                        call npm ci
                        if errorlevel 1 exit /b 1
                        echo [SUCCESS] Frontend dependencies installed successfully.
                    '''
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('client/KKS-platform') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        echo [INFO] Executing frontend build...
                        call npm run build
                        if errorlevel 1 exit /b 1
                        echo [SUCCESS] Frontend build completed successfully.
                    '''
                }
            }
        }

        stage('Backend Installation') {
            steps {
                dir('server/server') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        echo [INFO] Installing backend dependencies via npm ci...
                        call npm ci
                        if errorlevel 1 exit /b 1
                        echo [SUCCESS] Backend dependencies installed successfully.
                    '''
                }
            }
        }

        stage('Backend Unit Testing') {
            steps {
                dir('server/server') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        echo [INFO] Executing backend unit tests with JUnit reporting...
                        call npm run test:ci
                        if errorlevel 1 exit /b 1
                        if not exist test-results.xml (
                            echo [ERROR] Expected JUnit report test-results.xml was not generated!
                            exit /b 1
                        )
                        echo [SUCCESS] Backend unit tests completed successfully.
                    '''
                }
            }
        }

        stage('Backend Build') {
            steps {
                dir('server/server') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        echo [INFO] Executing backend build...
                        call npm run build
                        if errorlevel 1 exit /b 1
                        echo [SUCCESS] Backend build completed successfully.
                    '''
                }
            }
        }

        stage('Docker Environment Verification') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                bat '''
                    @echo off
                    echo [INFO] Verifying Docker CLI, Engine, and Compose availability...
                    where docker >nul 2>nul
                    if errorlevel 1 (
                        echo [ERROR] Docker CLI not found in PATH!
                        exit /b 1
                    )
                    docker version
                    if errorlevel 1 exit /b 1
                    docker info >nul
                    if errorlevel 1 (
                        echo [ERROR] Docker Engine is not reachable!
                        exit /b 1
                    )
                    docker compose version
                    if errorlevel 1 exit /b 1
                    docker ps --format "table {{.Names}}\\t{{.Status}}"
                    if errorlevel 1 exit /b 1
                    echo [SUCCESS] Docker environment verified.
                '''
            }
        }

        stage('Pre-Deployment Snapshot & Credential Check') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                script {
                    def prevBackend = bat(
                        script: '@docker inspect -f "{{.Image}}" kks-chatbot-backend 2>nul',
                        returnStdout: true
                    ).trim()
                    def prevFrontend = bat(
                        script: '@docker inspect -f "{{.Image}}" kks-chatbot-frontend 2>nul',
                        returnStdout: true
                    ).trim()

                    if (prevBackend && prevFrontend) {
                        env.PREV_BACKEND_IMAGE_ID = prevBackend
                        env.PREV_FRONTEND_IMAGE_ID = prevFrontend
                        env.ROLLBACK_TAG = "rollback-${env.BUILD_NUMBER}"
                        bat """
                            @echo off
                            docker tag ${prevBackend} kks-college-chatbot-backend:${env.ROLLBACK_TAG}
                            if errorlevel 1 exit /b 1
                            docker tag ${prevFrontend} kks-college-chatbot-frontend:${env.ROLLBACK_TAG}
                            if errorlevel 1 exit /b 1
                            docker image inspect kks-college-chatbot-backend:${env.ROLLBACK_TAG} >nul
                            if errorlevel 1 exit /b 1
                            docker image inspect kks-college-chatbot-frontend:${env.ROLLBACK_TAG} >nul
                            if errorlevel 1 exit /b 1
                        """
                        env.ROLLBACK_READY = 'true'
                        echo "[INFO] Verified rollback snapshot tags (${env.ROLLBACK_TAG}) for previous backend & frontend images."
                    } else {
                        echo '[INFO] No complete previous container pair found; rollback snapshot skipped.'
                    }
                }

                withCredentials([file(credentialsId: 'kks-backend-env', variable: 'KKS_BACKEND_ENV_FILE')]) {
                    bat '''
                        @echo off
                        if not exist "%KKS_BACKEND_ENV_FILE%" (
                            echo [ERROR] Bound credential file does not exist!
                            exit /b 1
                        )
                        powershell -NoProfile -Command "$required = @('PORT','NODE_ENV','MONGODB_URI','DB_NAME','VECTOR_INDEX_NAME','JWT_SECRET','JWT_EXPIRES_IN','CLIENT_URL','GOOGLE_API_KEY','GROQ_API_KEY','GROQ_MODEL','VAPI_API_KEY','VAPI_PHONE_NUMBER_ID','VAPI_ASSISTANT_ID'); $present = Get-Content -LiteralPath $env:KKS_BACKEND_ENV_FILE | ForEach-Object { if ($_ -match '^([^#=]+)=') { $matches[1].Trim() } }; $missing = $required | Where-Object { $_ -notin $present }; if ($missing.Count -gt 0) { Write-Error ('Missing required backend env keys: ' + ($missing -join ', ')); exit 1 }; Write-Host ('[OK] Verified ' + $required.Count + ' required backend environment variable names (values redacted).')"
                        if errorlevel 1 exit /b 1
                    '''
                }

                bat '''
                    @echo off
                    if defined KKS_BACKEND_ENV_FILE (
                        if exist "%KKS_BACKEND_ENV_FILE%" (
                            echo [ERROR] Temporary credential file still exists outside binding scope!
                            exit /b 1
                        )
                    )
                    echo [OK] Verified temporary credential file cleanup after binding scope.
                '''
            }
        }

        stage('Docker Image Build') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                bat '''
                    @echo off
                    echo [INFO] Re-checking disk space immediately before Docker build...
                    powershell -NoProfile -Command "$free = [math]::Round((Get-PSDrive C).Free / 1GB, 2); Write-Host ('C: Free Space = ' + $free + ' GB'); if ($free -lt [double]'%MIN_FREE_DISK_GB%') { Write-Error ('Insufficient disk space before Docker build: ' + $free + ' GB < %MIN_FREE_DISK_GB% GB'); exit 1 }"
                    if errorlevel 1 exit /b 1
                '''
                withCredentials([file(credentialsId: 'kks-backend-env', variable: 'KKS_BACKEND_ENV_FILE')]) {
                    bat '''
                        @echo off
                        set KKS_IMAGE_TAG=%RELEASE_TAG%
                        echo [INFO] Building Docker images for tag %KKS_IMAGE_TAG% (project: %COMPOSE_PROJECT_NAME%)...
                        docker compose -p %COMPOSE_PROJECT_NAME% build
                        if errorlevel 1 exit /b 1
                        docker tag kks-college-chatbot-backend:%KKS_IMAGE_TAG% kks-college-chatbot-backend:latest
                        if errorlevel 1 exit /b 1
                        docker tag kks-college-chatbot-frontend:%KKS_IMAGE_TAG% kks-college-chatbot-frontend:latest
                        if errorlevel 1 exit /b 1
                        echo [SUCCESS] Built release images %KKS_IMAGE_TAG% and updated :latest tags.
                    '''
                }
            }
        }

        stage('Docker Compose Deployment') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                script {
                    env.DEPLOYMENT_STARTED = 'true'
                }
                withCredentials([file(credentialsId: 'kks-backend-env', variable: 'KKS_BACKEND_ENV_FILE')]) {
                    bat '''
                        @echo off
                        set KKS_IMAGE_TAG=%RELEASE_TAG%
                        echo [INFO] Deploying Compose project %COMPOSE_PROJECT_NAME% with image tag %KKS_IMAGE_TAG%...
                        docker compose -p %COMPOSE_PROJECT_NAME% up -d --remove-orphans
                        if errorlevel 1 exit /b 1

                        echo [INFO] Waiting for kks-chatbot-backend health status...
                        powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { $s = (docker inspect -f '{{.State.Health.Status}}' kks-chatbot-backend 2>$null); if ($s -eq 'healthy') { Write-Host '[OK] kks-chatbot-backend is healthy.'; exit 0 }; Start-Sleep -Seconds 3 }; Write-Error ('Backend did not become healthy in time. Last status: ' + $s); exit 1"
                        if errorlevel 1 exit /b 1
                        docker compose -p %COMPOSE_PROJECT_NAME% ps
                    '''
                }
            }
        }

        stage('Post-Deployment Smoke Tests') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                bat '''
                    @echo off
                    echo [INFO] Running HTTP smoke tests against %APP_URL%...
                    powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $urls = @('/', '/chat', '/api/docs/', '/api/docs.json'); for ($attempt=1; $attempt -le 10; $attempt++) { try { $h = Invoke-RestMethod -Uri '%APP_URL%/api/health' -TimeoutSec 5; if (-not $h.success -or $h.status -ne 'healthy') { throw 'Unexpected health payload' }; foreach ($u in $urls) { $r = Invoke-WebRequest -UseBasicParsing -Uri ('%APP_URL%' + $u) -TimeoutSec 5; if ($r.StatusCode -ne 200) { throw ('Non-200 for ' + $u) } }; Write-Host '[OK] All 5 smoke test endpoints verified.'; exit 0 } catch { if ($attempt -eq 10) { Write-Error $_; exit 1 }; Start-Sleep -Seconds 3 } }"
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Newman API Regression Testing') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                bat '''
                    @echo off
                    echo [INFO] Running guarded Newman regression suite against %APP_URL%...
                    call npx --yes newman@%NEWMAN_VERSION% run postman/KKS-College-Chatbot.postman_collection.json -e postman/Local.postman_environment.json --env-var "baseUrl=%APP_URL%" --env-var "ENABLE_USER_REGISTRATION=false" --env-var "ENABLE_AUTH_LOGIN=false" --env-var "ENABLE_LIVE_AI_TESTS=false" --env-var "ENABLE_OUTBOUND_CALLS=false" --reporters cli,junit --reporter-junit-export newman-results.xml
                    if errorlevel 1 exit /b 1
                    if not exist newman-results.xml (
                        echo [ERROR] Expected Newman JUnit report newman-results.xml was not generated!
                        exit /b 1
                    )
                    echo [SUCCESS] Newman regression suite completed.
                '''
            }
        }

        stage('Selenium UI Testing') {
            when {
                allOf {
                    expression { return params.DEPLOY_APPLICATION == true }
                    expression {
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                        return (branch == 'main' || branch == 'origin/main' || branch == '*/main') && env.IS_MAIN_ANCESTOR == 'true'
                    }
                }
            }
            steps {
                dir('selenium-tests') {
                    bat '''
                        @echo off
                        echo [INFO] Installing Selenium test dependencies via npm ci...
                        call npm ci
                        if errorlevel 1 exit /b 1
                        echo [INFO] Running headless Chrome Selenium suite against %APP_URL%...
                        set SELENIUM_BASE_URL=%APP_URL%
                        call npm run test:ci
                        if errorlevel 1 exit /b 1
                        if not exist reports\\selenium-results.xml (
                            echo [ERROR] Expected Selenium JUnit report reports\\selenium-results.xml was not generated!
                            exit /b 1
                        )
                        echo [SUCCESS] Selenium UI tests completed successfully.
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('server/server/test-results.xml')) {
                    try {
                        junit testResults: 'server/server/test-results.xml', allowEmptyResults: false
                    } catch (err) {
                        echo "[ERROR] Failed to publish backend JUnit report: ${err.message}"
                        if (currentBuild.currentResult == 'SUCCESS') {
                            currentBuild.result = 'FAILURE'
                        }
                    }
                }
                if (params.DEPLOY_APPLICATION && env.DEPLOYMENT_STARTED == 'true' && fileExists('newman-results.xml')) {
                    try {
                        junit testResults: 'newman-results.xml', allowEmptyResults: false
                    } catch (err) {
                        echo "[ERROR] Failed to publish Newman JUnit report: ${err.message}"
                        if (currentBuild.currentResult == 'SUCCESS') {
                            currentBuild.result = 'FAILURE'
                        }
                    }
                }
                if (params.DEPLOY_APPLICATION && env.DEPLOYMENT_STARTED == 'true' && fileExists('selenium-tests/reports/selenium-results.xml')) {
                    try {
                        junit testResults: 'selenium-tests/reports/selenium-results.xml', allowEmptyResults: false
                    } catch (err) {
                        echo "[ERROR] Failed to publish Selenium JUnit report: ${err.message}"
                        if (currentBuild.currentResult == 'SUCCESS') {
                            currentBuild.result = 'FAILURE'
                        }
                    }
                }
                if (fileExists('selenium-tests/screenshots')) {
                    archiveArtifacts artifacts: 'selenium-tests/screenshots/*.png', allowEmptyArchive: true
                }
            }
        }
        success {
            echo '=========================================================='
            echo "[SUCCESS] Pipeline completed! (DEPLOY_APPLICATION=${params.DEPLOY_APPLICATION})"
            echo '=========================================================='
        }
        unsuccessful {
            echo '=========================================================='
            echo "[UNSUCCESSFUL] Pipeline ended with result: ${currentBuild.currentResult}"
            echo '=========================================================='
            script {
                // Note: Rollback restores the previous Docker image versions (rollback-${BUILD_NUMBER})
                // using the current workspace compose.yaml and current kks-backend-env Secret file.
                // Full Compose/env config rollback is a documented limitation for this local deployment.
                if (env.DEPLOYMENT_STARTED == 'true') {
                    echo '[INFO] Collecting sanitized container diagnostics prior to rollback...'
                    bat '''
                        @echo off
                        docker compose -p %COMPOSE_PROJECT_NAME% ps
                        docker compose -p %COMPOSE_PROJECT_NAME% logs --tail=30 kks-chatbot-frontend
                    '''
                    if (env.ROLLBACK_READY == 'true') {
                        echo "[WARN] Attempting image rollback to ${env.ROLLBACK_TAG}..."
                        try {
                            timeout(time: 5, unit: 'MINUTES') {
                                withCredentials([file(credentialsId: 'kks-backend-env', variable: 'KKS_BACKEND_ENV_FILE')]) {
                                bat '''
                                    @echo off
                                    set KKS_IMAGE_TAG=%ROLLBACK_TAG%
                                    docker compose -p %COMPOSE_PROJECT_NAME% up -d --no-build --remove-orphans
                                    if errorlevel 1 exit /b 1
                                    powershell -NoProfile -Command "for ($i=0; $i -lt 20; $i++) { $s = (docker inspect -f '{{.State.Health.Status}}' kks-chatbot-backend 2>$null); if ($s -eq 'healthy') { Write-Host '[OK] Rollback backend is healthy.'; exit 0 }; Start-Sleep -Seconds 3 }; Write-Error 'Rollback health check timed out.'; exit 1"
                                    if errorlevel 1 exit /b 1
                                    for /f "usebackq delims=" %%B in (`docker inspect -f "{{.Image}}" kks-chatbot-backend`) do set ACTUAL_BACKEND_ID=%%B
                                    for /f "usebackq delims=" %%F in (`docker inspect -f "{{.Image}}" kks-chatbot-frontend`) do set ACTUAL_FRONTEND_ID=%%F
                                    if not "%ACTUAL_BACKEND_ID%"=="%PREV_BACKEND_IMAGE_ID%" (
                                        echo [ERROR] Restored backend image ID mismatch!
                                        exit /b 1
                                    )
                                    if not "%ACTUAL_FRONTEND_ID%"=="%PREV_FRONTEND_IMAGE_ID%" (
                                        echo [ERROR] Restored frontend image ID mismatch!
                                        exit /b 1
                                    )
                                    echo [OK] Verified restored container image IDs match previous release.
                                '''
                                }
                            }
                            bat '''
                                @echo off
                                if defined KKS_BACKEND_ENV_FILE (
                                    if exist "%KKS_BACKEND_ENV_FILE%" (
                                        echo [ERROR] Rollback temporary credential file still exists outside binding scope!
                                        exit /b 1
                                    )
                                )
                            '''
                            echo '[SUCCESS] Automatic image rollback completed (build result remains unsuccessful).'
                        } catch (err) {
                            echo "[ERROR] Automatic rollback failed: ${err.message}"
                        }
                    } else {
                        echo '[WARN] No previous release snapshot was available for rollback.'
                    }
                } else {
                    echo '[INFO] Unsuccessful stage occurred prior to deployment; rollback not triggered.'
                }
            }
        }
        cleanup {
            bat '''
                @echo off
                powershell -NoProfile -Command "$free = [math]::Round((Get-PSDrive C).Free / 1GB, 2); Write-Host ('[DISK] C: Free Space = ' + $free + ' GB')"
                docker system df 2>nul || echo [INFO] Docker disk summary skipped.
            '''
            echo '[INFO] Post-build workspace cleanup...'
            cleanWs deleteDirs: true, notFailBuild: true
        }
    }
}

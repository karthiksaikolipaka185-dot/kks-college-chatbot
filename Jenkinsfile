pipeline {
    agent any

    options {
        skipDefaultCheckout()
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
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
                        echo Please ensure Git is installed and added to the system PATH.
                        exit /b 1
                    )
                    git --version
                    
                    echo.
                    echo [Node.js Version]
                    where node >nul 2>nul
                    if %ERRORLEVEL% neq 0 (
                        echo [ERROR] Node.js is not accessible in PATH!
                        echo Please ensure Node.js is installed and added to the system PATH.
                        exit /b 1
                    )
                    node -v
                    
                    echo.
                    echo [npm Version]
                    where npm >nul 2>nul
                    if %ERRORLEVEL% neq 0 (
                        echo [ERROR] npm is not accessible in PATH!
                        echo Please ensure npm is installed and added to the system PATH.
                        exit /b 1
                    )
                    call npm -v
                    
                    echo.
                    echo ========================================================
                    echo [SUCCESS] Environment check passed. All required tools are available.
                    echo ========================================================
                '''
            }
        }

        stage('Checkout') {
            steps {
                echo '[INFO] Checking out source code from configured SCM repository...'
                checkout scm
            }
        }

        stage('Frontend Installation') {
            steps {
                dir('client/KKS-platform') {
                    bat '''
                        @echo off
                        echo [INFO] Working directory: %CD%
                        if exist package-lock.json (
                            echo [INFO] package-lock.json detected. Executing clean installation (npm ci)...
                            call npm ci
                        ) else (
                            echo [INFO] package-lock.json not found. Executing standard installation (npm install)...
                            call npm install
                        )
                        if %ERRORLEVEL% neq 0 (
                            echo [ERROR] Frontend dependency installation failed!
                            exit /b %ERRORLEVEL%
                        )
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
                        echo [INFO] Executing frontend build (tsc -b && vite build)...
                        call npm run build
                        if %ERRORLEVEL% neq 0 (
                            echo [ERROR] Frontend build failed!
                            exit /b %ERRORLEVEL%
                        )
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
                        if exist package-lock.json (
                            echo [INFO] package-lock.json detected. Executing clean installation (npm ci)...
                            call npm ci
                        ) else (
                            echo [INFO] package-lock.json not found. Executing standard installation (npm install)...
                            call npm install
                        )
                        if %ERRORLEVEL% neq 0 (
                            echo [ERROR] Backend dependency installation failed!
                            exit /b %ERRORLEVEL%
                        )
                        echo [SUCCESS] Backend dependencies installed successfully.
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
                        echo [INFO] Executing backend build (tsc static type-check)...
                        call npm run build
                        if %ERRORLEVEL% neq 0 (
                            echo [ERROR] Backend build failed!
                            exit /b %ERRORLEVEL%
                        )
                        echo [SUCCESS] Backend build completed successfully.
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '=========================================================='
            echo '[SUCCESS] KKS College Chatbot CI Pipeline completed successfully!'
            echo 'Both frontend and backend applications were built and validated.'
            echo '=========================================================='
        }
        failure {
            echo '=========================================================='
            echo '[FAILURE] Pipeline execution failed!'
            echo 'Review the specific stage failure logs above for diagnostic details.'
            echo '=========================================================='
        }
        always {
            echo '[INFO] Post-build workspace cleanup...'
            cleanWs deleteDirs: true, notFailBuild: true
        }
    }
}

@echo off
setlocal EnableDelayedExpansion

REM ==================================================================
REM VimaDimension - Local Stack Launcher
REM ------------------------------------------------------------------
REM Starts MySQL (if needed), frontend (npm start), and backend JAR.
REM Adjust MYSQL_SERVICE_NAME if your MySQL service uses a custom name.
REM ==================================================================

set "SCRIPT_DIR=%~dp0..\..\"
pushd "%SCRIPT_DIR%" >nul 2>&1

set "MYSQL_USER=root"
set "MYSQL_PASSWORD=Vimaerp@123"
set "MYSQL_HOST=127.0.0.1"
set "MYSQL_PORT=3306"
set "MYSQL_SERVICE_NAME=MySQL80"
set "MYSQLADMIN_BIN="

call :log "Checking MySQL status..."
call :find_mysqladmin
call :ensure_mysql_running

call :log "Launching frontend (npm start)..."
call :start_frontend

call :log "Launching backend JAR..."
call :start_backend

call :log "All launch commands dispatched. Check new windows for logs."
popd >nul 2>&1
goto :eof

:find_mysqladmin
    if defined MYSQLADMIN_BIN exit /b 0

    for %%I in (mysqladmin.exe) do (
        where %%I >nul 2>&1 && set "MYSQLADMIN_BIN=%%I"
    )

    if not defined MYSQLADMIN_BIN (
        if exist "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysqladmin.exe" set "MYSQLADMIN_BIN=%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysqladmin.exe"
    )

    if not defined MYSQLADMIN_BIN (
        call :warn "mysqladmin.exe not found in PATH. Skipping ping check."
    ) else (
        call :log "Using mysqladmin at '%MYSQLADMIN_BIN%'"
    )
    exit /b 0

:ensure_mysql_running
    set "MYSQL_RUNNING=0"
    if defined MYSQLADMIN_BIN (
        "%MYSQLADMIN_BIN%" --host=%MYSQL_HOST% --port=%MYSQL_PORT% --user=%MYSQL_USER% --password=%MYSQL_PASSWORD% --connect-timeout=3 ping >nul 2>&1 && set "MYSQL_RUNNING=1"
    )

    if "%MYSQL_RUNNING%"=="1" (
        call :log "MySQL already running."
        exit /b 0
    )

    call :log "Attempting to start MySQL service '%MYSQL_SERVICE_NAME%'..."
    sc query "%MYSQL_SERVICE_NAME%" >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        call :warn "Service '%MYSQL_SERVICE_NAME%' not found. Start MySQL manually."
        exit /b 1
    )

    net start "%MYSQL_SERVICE_NAME%"
    if %ERRORLEVEL% neq 0 (
        call :warn "Failed to start MySQL service '%MYSQL_SERVICE_NAME%'."
        exit /b 1
    )

    timeout /t 5 /nobreak >nul

    if defined MYSQLADMIN_BIN (
        "%MYSQLADMIN_BIN%" --host=%MYSQL_HOST% --port=%MYSQL_PORT% --user=%MYSQL_USER% --password=%MYSQL_PASSWORD% --connect-timeout=3 ping >nul 2>&1 && set "MYSQL_RUNNING=1"
    ) else (
        set "MYSQL_RUNNING=1"
    )

    if "%MYSQL_RUNNING%"=="1" (
        call :log "MySQL service is running."
    ) else (
        call :warn "MySQL ping still failing. Check credentials or service logs."
    )
    exit /b 0

:start_frontend
    if not exist "frontend" (
        call :warn "Frontend directory not found. Skipping frontend launch."
        exit /b 1
    )

    pushd frontend >nul 2>&1
    start "VimaDimension Frontend" cmd /k "npm install && npm start"
    popd >nul 2>&1
    exit /b 0

:start_backend
    set "JAR_NAME=vimadimension-1.0-SNAPSHOT.jar"
    set "JAR_PATH="

    if exist "%SCRIPT_DIR%%JAR_NAME%" set "JAR_PATH=%SCRIPT_DIR%%JAR_NAME%"
    if not defined JAR_PATH if exist "%SCRIPT_DIR%build\libs\%JAR_NAME%" set "JAR_PATH=%SCRIPT_DIR%build\libs\%JAR_NAME%"

    if not defined JAR_PATH (
        call :warn "'%JAR_NAME%' not found in project root or build\\libs."
        exit /b 1
    )

    start "VimaDimension Backend" cmd /k "cd /d %SCRIPT_DIR% && java -Xms1024m -Xmx1024m -jar \"%JAR_PATH%\""
    exit /b 0

:log
    echo [INFO ] %~1
    exit /b 0

:warn
    echo [WARN ] %~1
    exit /b 0

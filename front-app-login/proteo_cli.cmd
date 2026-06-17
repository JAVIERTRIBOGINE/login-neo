@echo off
echo Checking if @proteo/cli is installed globally...

REM Capture the output of npm list
for /f "delims=" %%i in ('npm list -g @proteo/cli') do (
    echo %%i | find "@proteo/cli@" >nul
    if not errorlevel 1 (
        set FOUND=1
    )
)

if not defined FOUND (
    echo @proteo/cli not found. Installing...
    npm i -g @proteo/cli
    echo Running p4 update...
    p4 update
) else (
    echo @proteo/cli is already installed.
    echo Running p4 update...
    p4 update
)



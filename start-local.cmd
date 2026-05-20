@echo off
setlocal
cd /d "%~dp0"

if exist app.log del /f /q app.log
if exist app.err.log del /f /q app.err.log

call mvnw.cmd spring-boot:run 1>app.log 2>app.err.log

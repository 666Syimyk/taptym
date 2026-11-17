@echo off
rem Double-click to start Tabyldy: API, admin panel and the app, then open the browser.
cd /d "%~dp0"
title Tabyldy
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 24+ from https://nodejs.org and run START again.
  pause
  exit /b 1
)
node scripts\start.mjs
if errorlevel 1 pause

@echo off
cd /d "%~dp0"
echo.
echo  hainedot.com（ファインダー）を開いています...
echo  この黒い画面は閉じないでください。
echo.
start http://localhost:8000/
python -m http.server 8000
pause

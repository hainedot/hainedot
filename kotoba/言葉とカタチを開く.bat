@echo off
cd /d "%~dp0"
echo.
echo  言葉とカタチ を開いています...
echo  この黒い画面は閉じないでください。
echo.
start http://localhost:8001/
python -m http.server 8001
pause

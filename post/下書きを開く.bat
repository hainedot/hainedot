@echo off
cd /d "%~dp0.."
echo.
echo  下書きページを開いています...
echo  この黒い画面は閉じないでください。
echo.
start http://localhost:8000/post/
python -m http.server 8000
pause

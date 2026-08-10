@echo off
echo ============================================================
echo      KASHWAVE PLATFORM - GITHUB & VERCEL AUTO-SYNC
echo ============================================================
echo.
echo [1/3] Staging all changed files and code...
git add .

echo.
echo [2/3] Creating commit...
git commit -m "Auto-sync project changes: %date% %time%"

echo.
echo [3/3] Pushing changes to GitHub main branch...
git push origin main

echo.
echo ============================================================
echo      SUCCESS! All changes pushed to GitHub & Vercel.
echo ============================================================
pause

@echo off
title VLITS College Portal Database Server
echo ====================================================================
echo Starting Vignan's Lara Institute Student & Faculty Portal Server...
echo Local database connection will be hosted on SQLite (vlits.db)
echo ====================================================================
echo.

:: Open default web browser to local server address
start http://localhost:8000

:: Start the Python backend server
python server.py

pause

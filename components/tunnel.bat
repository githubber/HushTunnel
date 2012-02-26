@echo off
cls
color 0e
title Encrypted tunnel
prompt $_
del "%~dp0\..\defaults\preferences\hushtunnel.js"
echo y | "%~dp0\plink.exe" -ssh -pw %1 -C -A -N -L %2 %3 > NUL 2>&1 | echo.

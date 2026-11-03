@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   ULAK Windows Ozel Setup (.exe) Derleme Araci
echo ========================================================
echo.

set "ROOT=%~dp0"
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
set "WPF=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\WPF"
set "SEVEN_ZA=%ROOT%ulak-windows\node_modules\7zip-bin\win\x64\7za.exe"

REM 1. Paketlenmis uygulama dosyalarini hazirla
echo [1/3] Electron uygulamasi kontrol ediliyor...
if not exist "%ROOT%ulak-windows\dist\win-unpacked\ULAK.exe" (
    echo Electron dosyalari bulunamadi, derleniyor...
    cd /d "%ROOT%ulak-windows"
    call npx electron-builder --win --dir
    cd /d "%ROOT%"
)

REM 2. Payload olustur
echo [2/3] Kurulum paketi (payload.zip) hazirlaniyor...
if not exist "%ROOT%installer_build" mkdir "%ROOT%installer_build"
copy /y "%ROOT%ulak-windows\assets\icon.png" "%ROOT%installer_build\logo.png" >nul 2>&1
copy /y "%ROOT%ulak-windows\assets\icon.ico" "%ROOT%installer_build\app.ico" >nul 2>&1

"%SEVEN_ZA%" a -tzip -mx=7 "%ROOT%installer_build\payload.zip" "%ROOT%ulak-windows\dist\win-unpacked\*" >nul

REM 3. Ozel Kurulum Sihirbazini (setup.exe) Derle
echo [3/3] ULAK Ozel Arayuzlu setup.exe derleniyor...
if not exist "%ROOT%dist" mkdir "%ROOT%dist"

"%CSC%" /target:winexe /optimize+ /platform:x64 ^
    /out:"%ROOT%dist\setup.exe" ^
    /win32icon:"%ROOT%installer_build\app.ico" ^
    /lib:"%WPF%" ^
    /r:PresentationFramework.dll ^
    /r:PresentationCore.dll ^
    /r:WindowsBase.dll ^
    /r:System.Xaml.dll ^
    /r:System.Windows.Forms.dll ^
    /r:System.Drawing.dll ^
    /r:System.IO.Compression.dll ^
    /r:System.IO.Compression.FileSystem.dll ^
    /r:Microsoft.CSharp.dll ^
    /resource:"%ROOT%installer_build\logo.png",ULAK.logo.png ^
    /resource:"%ROOT%installer_build\payload.zip",ULAK.payload.zip ^
    "%ROOT%installer_build\InstallerApp.cs"

if %ERRORLEVEL% equ 0 (
    copy /y "%ROOT%dist\setup.exe" "%ROOT%dist\ULAK-Setup.exe" >nul
    copy /y "%ROOT%dist\setup.exe" "%ROOT%dist\uninstall.exe" >nul
    copy /y "%ROOT%dist\setup.exe" "%ROOT%ulak-windows\dist\setup.exe" >nul
    copy /y "%ROOT%dist\setup.exe" "%ROOT%ulak-windows\dist\ULAK-Setup.exe" >nul
    copy /y "%ROOT%dist\setup.exe" "%ROOT%ulak-windows\dist\uninstall.exe" >nul
    if exist "%ROOT%ulak-windows\dist\win-unpacked" (
        copy /y "%ROOT%dist\setup.exe" "%ROOT%ulak-windows\dist\win-unpacked\uninstall.exe" >nul 2>&1
    )
    echo.
    echo ========================================================
    echo   BASARILI: ULAK Ozel Setup ve Uninstaller Olusturuldu!
    echo   Konumlar:
    echo     - dist\setup.exe      (Ozel Arayuzlu Kurulum)
    echo     - dist\uninstall.exe  (Ozel Arayuzlu Kaldirici)
    echo ========================================================
) else (
    echo.
    echo [HATA] Derleme sirasinda bir hata meydana geldi!
)

pause

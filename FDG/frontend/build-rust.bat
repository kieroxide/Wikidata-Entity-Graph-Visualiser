@echo off
echo Building Rust WASM module...
echo.

REM Navigate to the Rust project directory
cd /d "C:\Users\Owner\Desktop\Pinned Projects\Wikidata-Entity-Graph-Visualiser\FDG\frontend\src\utility\Forces\Rust\fdg_wasm"

REM Check if wasm-pack is installed
wasm-pack --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: wasm-pack is not installed or not in PATH
    echo Please install wasm-pack: https://rustwasm.github.io/wasm-pack/installer/
    pause
    exit /b 1
)

echo Found wasm-pack, building...
echo.

REM Build the WASM module for web target
wasm-pack build --target web --release

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build successful!
    echo WASM module built in: pkg/
    echo.
    echo Generated files:
    dir pkg\*.js pkg\*.wasm pkg\*.ts 2>nul
) else (
    echo.
    echo ❌ Build failed!
    echo Check the error messages above.
)

echo.
pause
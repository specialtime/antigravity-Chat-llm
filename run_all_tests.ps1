# PowerShell script to run all tests

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Running Backend Tests (Python)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Set-Location backend
python -m pytest -v --tb=short
$backendExit = $LASTEXITCODE

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Running Frontend Tests (JavaScript)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Set-Location ..\frontend
npx vitest run src/test/ChatInput.test.jsx src/test/MessageBubble.test.jsx src/test/utils.test.jsx
$frontendExit = $LASTEXITCODE

Set-Location ..

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($backendExit -eq 0) {
    Write-Host "✅ Backend tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Backend tests: FAILED" -ForegroundColor Red
}

if ($frontendExit -eq 0) {
    Write-Host "✅ Frontend tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend tests: FAILED" -ForegroundColor Red
}

if ($backendExit -eq 0 -and $frontendExit -eq 0) {
    Write-Host ""
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  Some tests failed" -ForegroundColor Yellow
    exit 1
}

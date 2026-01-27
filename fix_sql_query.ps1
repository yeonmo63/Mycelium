$filePath = "d:\workspace\rust\csi_manager\src-tauri\src\lib.rs"
$content = Get-Content $filePath -Raw

# Fix SQL query missing $1 parameter
$content = $content -replace 'SELECT id, username, password_hash, role, created_at FROM users WHERE username = "', 'SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1"'

Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Fixed SQL query in login command"

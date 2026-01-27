$filePath = "d:\workspace\rust\csi_manager\src-tauri\src\lib.rs"
$content = Get-Content $filePath -Raw

# Replace HTML entities with proper Rust syntax  
$content = $content -replace '&lt;', '<'
$content = $content -replace '&gt;', '>'
$content = $content -replace '&amp;', '&'

Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Fixed HTML entities in lib.rs"

$path = "d:\workspace\rust\csi-manager\src\index.css"
$lines = Get-Content $path
# Keep the first 3479 lines (indexes 0 to 3478, which corresponds to line 1 to 3479)
# Line 3478 is "}" of .spinner. Line 3479 is empty.
$keep = $lines[0..3478]

$tail = @"

/* Tweaks for Dashboard Top Products Table */
#dashboard-top-products-card .stylish-table td {
  padding: 8px 10px !important;
}

.stylish-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.stylish-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.stylish-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(99, 102, 241, 0.3);
  border-radius: 10px;
}

.stylish-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(99, 102, 241, 0.6);
}
"@

$newContent = ($keep -join "`r`n") + $tail
[System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
Write-Output "Fixed index.css"

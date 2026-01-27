# update_membership.ps1
$ErrorActionPreference = "Stop"
$envPath = Join-Path $PSScriptRoot ".env"
Write-Host "Checking .env at $envPath"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $dbUrl = $null
    foreach ($line in $envContent) {
        if ($line -match "^DATABASE_URL=(.+)$") {
            $dbUrl = $matches[1]
            break
        }
    }

    if ($dbUrl) {
        # Robust Parsing
        if ($dbUrl -match "^postgres://(.+)$") {
            $remainder = $matches[1]
            $lastAt = $remainder.LastIndexOf('@')
            
            if ($lastAt -gt 0) {
                $credsPart = $remainder.Substring(0, $lastAt)
                $serverPart = $remainder.Substring($lastAt + 1)
                
                # Creds: user:pass
                $firstColon = $credsPart.IndexOf(':')
                if ($firstColon -gt 0) {
                    $user = $credsPart.Substring(0, $firstColon)
                    $pass = $credsPart.Substring($firstColon + 1)
                }
                else {
                    $user = $credsPart
                    $pass = ""
                }

                # Server: host:port/dbname
                if ($serverPart -match "^([^:]+):(\d+)/(.+)$") {
                    $dbHost = $matches[1]
                    $port = $matches[2]
                    $dbname = $matches[3]
                    
                    Write-Host "Detected DB: $dbname on ${dbHost}:${port} as $user"

                    $env:PGPASSWORD = $pass
                
                    # Update Query
                    $query = "UPDATE customers SET membership_level = CASE WHEN random() < 0.05 THEN 'VIP' ELSE '일반' END WHERE membership_level IS NULL OR membership_level = '';"
                
                    Write-Host "Executing Update..."
                    & psql -h $dbHost -p $port -U $user -d $dbname -c $query

                    # Verification Query
                    $verifyQuery = "SELECT membership_level, COUNT(*) FROM customers GROUP BY membership_level;"
                    Write-Host "`nVerification:"
                    & psql -h $dbHost -p $port -U $user -d $dbname -c $verifyQuery
                
                    $env:PGPASSWORD = $null 
                }
                else {
                    Write-Error "Invalid server part format: $serverPart"
                }
            }
            else {
                Write-Error "Invalid URL format (no @ found)"
            }
        }
        else {
            Write-Error "URL does not start with postgres://"
        }
    }
    else {
        Write-Error "DATABASE_URL not found in .env"
    }
}
else {
    Write-Error ".env file not found in $PSScriptRoot"
}

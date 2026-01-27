# create_indexes.ps1
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
        if ($dbUrl -match "^postgres://(.+)$") {
            $remainder = $matches[1]
            $lastAt = $remainder.LastIndexOf('@')
            
            if ($lastAt -gt 0) {
                $credsPart = $remainder.Substring(0, $lastAt)
                $serverPart = $remainder.Substring($lastAt + 1)
                
                $firstColon = $credsPart.IndexOf(':')
                if ($firstColon -gt 0) {
                    $user = $credsPart.Substring(0, $firstColon)
                    $pass = $credsPart.Substring($firstColon + 1)
                }
                else {
                    $user = $credsPart
                    $pass = ""
                }

                if ($serverPart -match "^([^:]+):(\d+)/(.+)$") {
                    $dbHost = $matches[1]
                    $port = $matches[2]
                    $dbname = $matches[3]
                    
                    Write-Host "Detected DB: $dbname on ${dbHost}:${port} as $user"

                    $env:PGPASSWORD = $pass
                
                    # Index Creation Queries
                    $queries = @(
                        "CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales(order_date);",
                        "CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);",
                        "CREATE INDEX IF NOT EXISTS idx_sales_product_name ON sales(product_name);",
                        "CREATE INDEX IF NOT EXISTS idx_customers_join_date ON customers(join_date);",
                        "CREATE INDEX IF NOT EXISTS idx_customers_membership ON customers(membership_level);"
                    )
                
                    foreach ($q in $queries) {
                        Write-Host "Executing: $q"
                        & psql -h $dbHost -p $port -U $user -d $dbname -c $q
                    }
                    
                    $env:PGPASSWORD = $null 
                    Write-Host "Index creation complete."
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

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$BackupsDir = "",
    [switch]$Force,
    [switch]$SkipSafetyBackup,
    [switch]$NoRestart
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
    param(
        [scriptblock]$Action,
        [string]$ErrorMessage
    )

    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

try {
    if (-not $BackupsDir) {
        $BackupsDir = Join-Path $ProjectRoot "backups"
    }

    Set-Location $ProjectRoot

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker no esta instalado o no esta en PATH."
    }

    if (-not (Test-Path $BackupsDir)) {
        throw "No existe el directorio de backups: $BackupsDir"
    }

    $latestBackup = Get-ChildItem -Path $BackupsDir -Filter "backup_*.sql" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestBackup) {
        throw "No se encontro ningun backup con patron backup_*.sql en $BackupsDir"
    }

    Write-Host "Backup seleccionado: $($latestBackup.FullName)"

    if (-not $Force) {
        $confirm = Read-Host "Esto reemplazara completamente la base actual. Escribe RESTAURAR para continuar"
        if ($confirm -ne "RESTAURAR") {
            throw "Operacion cancelada por el usuario."
        }
    }

    Write-Host "Iniciando servicio db..."
    Invoke-Checked -Action { docker compose up -d db | Out-Null } -ErrorMessage "No se pudo iniciar el servicio db"

    if (-not $SkipSafetyBackup) {
        $preRestoreFile = Join-Path $BackupsDir ("pre_restore_{0}.sql" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
        Write-Host "Creando backup de seguridad en: $preRestoreFile"

        Invoke-Checked -Action {
            docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' |
                Out-File -FilePath $preRestoreFile -Encoding utf8
        } -ErrorMessage "No se pudo crear el backup de seguridad previo"
    }

    Write-Host "Recreando base de datos objetivo..."
    Invoke-Checked -Action {
        docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"'
    } -ErrorMessage "No se pudo resetear la base de datos"

    Write-Host "Importando backup..."
    Invoke-Checked -Action {
        Get-Content -Path $latestBackup.FullName -Raw |
            docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
    } -ErrorMessage "Fallo la importacion del backup"

    if (-not $NoRestart) {
        Write-Host "Reiniciando backend y nginx..."
        Invoke-Checked -Action {
            docker compose restart backend nginx | Out-Null
        } -ErrorMessage "La restauracion se completo, pero fallo el reinicio de backend/nginx"
    }

    Write-Host "Restauracion completada correctamente." -ForegroundColor Green
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}

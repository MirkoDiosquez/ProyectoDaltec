param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$BackupsDir = "",
    [switch]$Force,
    [switch]$SkipSafetyBackup,
    [switch]$NoRestart
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = $utf8NoBom
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom

function Get-EnvValue {
    param(
        [string]$EnvFilePath,
        [string]$Key
    )

    if (-not (Test-Path $EnvFilePath)) {
        throw "No existe el archivo .env en: $EnvFilePath"
    }

    $line = Select-String -Path $EnvFilePath -Pattern ("^{0}=(.*)$" -f [regex]::Escape($Key)) | Select-Object -First 1
    if (-not $line) {
        throw "No se encontro la variable $Key en $EnvFilePath"
    }

    return $line.Matches[0].Groups[1].Value.Trim()
}

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

function Invoke-BackupRetention {
    param(
        [string]$TargetDir,
        [string]$Pattern,
        [int]$Keep = 2
    )

    $files = Get-ChildItem -Path $TargetDir -Filter $Pattern -File |
        Sort-Object LastWriteTime -Descending

    if ($files.Count -le $Keep) {
        return
    }

    $files | Select-Object -Skip $Keep | ForEach-Object {
        Remove-Item -Path $_.FullName -Force
        Write-Host "Eliminado por retencion: $($_.Name)"
    }
}

try {
    if (-not $BackupsDir) {
        $BackupsDir = Join-Path $ProjectRoot "backups"
    }

    $envFilePath = Join-Path $ProjectRoot ".env"
    $dbRootPassword = Get-EnvValue -EnvFilePath $envFilePath -Key "DB_ROOT_PASSWORD"
    $dbName = Get-EnvValue -EnvFilePath $envFilePath -Key "DB_NAME"

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
            docker compose exec -T db mysqldump --default-character-set=utf8mb4 -uroot -p"$dbRootPassword" "$dbName" |
                Set-Content -Path $preRestoreFile -Encoding utf8
        } -ErrorMessage "No se pudo crear el backup de seguridad previo"
    }

    Write-Host "Recreando base de datos objetivo..."
    Invoke-Checked -Action {
        docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -p"$dbRootPassword" -e "DROP DATABASE IF EXISTS ``$dbName``; CREATE DATABASE ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    } -ErrorMessage "No se pudo resetear la base de datos"

    Write-Host "Importando backup..."
    Invoke-Checked -Action {
        Get-Content -Path $latestBackup.FullName -Encoding utf8 -Raw |
            docker compose exec -T db mysql --default-character-set=utf8mb4 -uroot -p"$dbRootPassword" "$dbName"
    } -ErrorMessage "Fallo la importacion del backup"

    Write-Host "Normalizando catalogos base..."
    Invoke-Checked -Action {
        docker compose exec -T backend python manage.py load_catalogs | Out-Null
    } -ErrorMessage "La restauracion se completo, pero fallo la normalizacion de catalogos"

    if (-not $NoRestart) {
        Write-Host "Reiniciando backend y nginx..."
        Invoke-Checked -Action {
            docker compose restart backend nginx | Out-Null
        } -ErrorMessage "La restauracion se completo, pero fallo el reinicio de backend/nginx"
    }

    # Keep only latest and previous backups for both regular and safety backups.
    Invoke-BackupRetention -TargetDir $BackupsDir -Pattern "backup_*.sql" -Keep 2
    Invoke-BackupRetention -TargetDir $BackupsDir -Pattern "pre_restore_*.sql" -Keep 2

    Write-Host "Restauracion completada correctamente." -ForegroundColor Green
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}

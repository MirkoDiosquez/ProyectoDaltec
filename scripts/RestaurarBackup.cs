using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

class GestionBackup
{
    // Shared state so DoRestore can receive an explicit file path
    static string _explicitBackupFile = null;
    // -----------------------------------------------------------------------
    // Entry point
    // -----------------------------------------------------------------------
    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;

        string exeDir      = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
        string projectRoot = Path.GetFullPath(Path.Combine(exeDir, ".."));
        string backupsDir  = Path.Combine(projectRoot, "backups");
        string ps1Path     = Path.Combine(exeDir, "restore_latest_backup.ps1");

        PrintHeader();

        // Validate dependencies once
        if (!File.Exists(ps1Path))  { Error("No se encontro: " + ps1Path); return 1; }
        if (!Directory.Exists(backupsDir)) Directory.CreateDirectory(backupsDir);

        while (true)
        {
            PrintMenu(backupsDir);
            Console.Write("Opcion: ");
            string choice = (Console.ReadLine() ?? "").Trim();
            Console.WriteLine();

            switch (choice)
            {
                case "1":
                    _explicitBackupFile = null;
                    int r = DoRestore(projectRoot, backupsDir, ps1Path);
                    if (r != 0) { Pause(); }
                    break;
                case "2":
                    DoBackup(projectRoot, backupsDir);
                    Pause();
                    break;
                case "3":
                    ListAndMaybeRestore(projectRoot, backupsDir, ps1Path);
                    break;
                case "0":
                    return 0;
                default:
                    Warn("Opcion no valida. Intenta de nuevo.");
                    break;
            }
            Console.WriteLine();
        }
    }

    // -----------------------------------------------------------------------
    // MENU
    // -----------------------------------------------------------------------
    static void PrintHeader()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("================================================");
        Console.WriteLine("    Gestion de Base de Datos - ProyectoDaltec   ");
        Console.WriteLine("================================================");
        Console.ResetColor();
        Console.WriteLine();
    }

    static void PrintMenu(string backupsDir)
    {
        var backups = GetBackups(backupsDir);
        string latestInfo = backups.Length > 0
            ? Path.GetFileName(backups[0]) + "  (" + new FileInfo(backups[0]).LastWriteTime.ToString("yyyy-MM-dd HH:mm") + ")"
            : "(no hay backups)";

        Console.ForegroundColor = ConsoleColor.White;
        Console.WriteLine("  [1] Restaurar base de datos desde backup mas reciente");
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.WriteLine("      " + latestInfo);
        Console.ResetColor();
        Console.WriteLine("  [2] Generar nuevo backup ahora");
        Console.WriteLine("  [3] Ver lista de backups");
        Console.WriteLine("  [0] Salir");
        Console.WriteLine();
    }

    // -----------------------------------------------------------------------
    // OPTION 3 — LIST + optional restore (regular + pre_restore)
    // -----------------------------------------------------------------------
    static void ListAndMaybeRestore(string projectRoot, string backupsDir, string ps1Path)
    {
        while (true)
        {
            Console.Clear();
            PrintHeader();

            var regular    = GetBackups(backupsDir);
            var preRestore = Directory.GetFiles(backupsDir, "pre_restore_*.sql")
                                      .OrderByDescending(f => new FileInfo(f).LastWriteTime)
                                      .ToArray();

            // Build a single ordered index: regular first, then pre_restore
            var all = new System.Collections.Generic.List<string>();
            all.AddRange(regular);
            all.AddRange(preRestore);

            int counter = 1;

            Console.WriteLine("  Backups regulares (backup_*.sql):");
            if (regular.Length == 0)
                Console.WriteLine("    (ninguno)");
            else
                for (int i = 0; i < regular.Length; i++, counter++)
                {
                    var fi = new FileInfo(regular[i]);
                    Console.ForegroundColor = i == 0 ? ConsoleColor.Green : ConsoleColor.White;
                    Console.Write(string.Format("    [{0}] {1}  {2}  {3:F2} MB",
                        counter,
                        fi.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"),
                        fi.Name,
                        fi.Length / 1048576.0));
                    if (i == 0) Console.Write("  <- mas reciente");
                    Console.ResetColor();
                    Console.WriteLine();
                }

            Console.WriteLine();
            Console.WriteLine("  Backups de seguridad pre-restauracion (pre_restore_*.sql):");
            if (preRestore.Length == 0)
                Console.WriteLine("    (ninguno)");
            else
                for (int i = 0; i < preRestore.Length; i++, counter++)
                {
                    var fi = new FileInfo(preRestore[i]);
                    Console.ForegroundColor = ConsoleColor.DarkYellow;
                    Console.Write(string.Format("    [{0}] {1}  {2}  {3:F2} MB",
                        counter,
                        fi.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"),
                        fi.Name,
                        fi.Length / 1048576.0));
                    Console.ResetColor();
                    Console.WriteLine();
                }

            Console.WriteLine();

            if (all.Count == 0)
            {
                Warn("No hay backups disponibles.");
                Pause();
                break;
            }

            Console.WriteLine("  Escribe el numero del backup a restaurar, o Enter para volver al menu:");
            Console.Write("  Opcion: ");
            string sel = (Console.ReadLine() ?? "").Trim();
            if (sel == "") break;

            int idx;
            if (!int.TryParse(sel, out idx) || idx < 1 || idx > all.Count)
            {
                Warn("Numero fuera de rango.");
                System.Threading.Thread.Sleep(1200);
                continue;
            }

            Console.WriteLine();
            _explicitBackupFile = all[idx - 1];
            int r = DoRestore(projectRoot, backupsDir, ps1Path);
            _explicitBackupFile = null;
            if (r != 0) Pause();
            break;
        }
    }

    // -----------------------------------------------------------------------
    // OPTION 1 — RESTORE
    // -----------------------------------------------------------------------
    static int DoRestore(string projectRoot, string backupsDir, string ps1Path)
    {
        string target;
        if (_explicitBackupFile != null)
            target = _explicitBackupFile;
        else
        {
            var backups = GetBackups(backupsDir);
            if (backups.Length == 0) { Error("No hay archivos backup_*.sql en: " + backupsDir); return 1; }
            target = backups[0];
        }

        var    fi     = new FileInfo(target);
        double sizeMb = fi.Length / 1048576.0;

        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("Backup seleccionado:");
        Console.ResetColor();
        Console.WriteLine("  Archivo: " + fi.Name);
        Console.WriteLine("  Fecha:   " + fi.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"));
        Console.WriteLine("  Tamano:  " + sizeMb.ToString("F2") + " MB");
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("ADVERTENCIA: Esto reemplazara completamente la base de datos actual.");
        Console.WriteLine("Se creara un backup de seguridad automaticamente antes de restaurar.");
        Console.ResetColor();
        Console.WriteLine();
        Console.Write("Escribe RESTAURAR para continuar (o Enter para cancelar): ");
        string input = (Console.ReadLine() ?? "").Trim();

        if (input != "RESTAURAR")
        {
            Warn("Operacion cancelada.");
            return 0;
        }

        Console.WriteLine();
        Info("Iniciando restauracion...");
        Console.WriteLine();

        string psArgs = string.Format(
            "-NoProfile -ExecutionPolicy Bypass -File \"{0}\" -Force -BackupFile \"{1}\"",
            ps1Path, target
        );

        int exit = RunPowerShell(projectRoot, psArgs);

        Console.WriteLine();
        if (exit == 0)
            Ok("Restauracion completada exitosamente.");
        else
            Error("La restauracion termino con errores (codigo: " + exit + ").");

        return exit;
    }

    // -----------------------------------------------------------------------
    // OPTION 2 — BACKUP
    // -----------------------------------------------------------------------
    static void DoBackup(string projectRoot, string backupsDir)
    {
        string envFile = Path.Combine(projectRoot, ".env");
        string dbRootPwd, dbName;

        try
        {
            dbRootPwd = ReadEnvVar(envFile, "DB_ROOT_PASSWORD");
            dbName    = ReadEnvVar(envFile, "DB_NAME");
        }
        catch (Exception ex)
        {
            Error(ex.Message);
            return;
        }

        string timestamp  = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        string outputFile = Path.Combine(backupsDir, "backup_" + timestamp + ".sql");

        Info("Generando backup...");
        Console.WriteLine("  Destino: " + outputFile);
        Console.WriteLine();

        // Build the mysqldump command that runs inside the db container
        // docker compose exec -T db mysqldump ... > outputFile
        // We pipe via PowerShell to redirect output to a file on the host
        string psScript = string.Format(
            "Set-Location '{0}'; " +
            "docker compose exec -T db mysqldump " +
            "--default-character-set=utf8mb4 " +
            "--single-transaction " +
            "--routines " +
            "--triggers " +
            "--add-drop-table " +
            "--set-gtid-purged=OFF " +
            "-uroot -p'{1}' '{2}' | " +
            "Set-Content -Path '{3}' -Encoding utf8; " +
            "exit $LASTEXITCODE",
            projectRoot.Replace("'", "''"),
            dbRootPwd.Replace("'", "''"),
            dbName.Replace("'", "''"),
            outputFile.Replace("'", "''")
        );

        int exit = RunPowerShell(
            projectRoot,
            "-NoProfile -ExecutionPolicy Bypass -Command \"" + psScript.Replace("\"", "\\\"") + "\""
        );

        if (exit != 0 || !File.Exists(outputFile))
        {
            Error("Fallo la generacion del backup.");
            if (File.Exists(outputFile)) File.Delete(outputFile);
            return;
        }

        double sizeMb = new FileInfo(outputFile).Length / 1048576.0;
        Ok(string.Format("Backup creado: {0}  ({1:F2} MB)", Path.GetFileName(outputFile), sizeMb));
        Console.WriteLine();

        // Retention: keep only 2 regular backups
        ApplyRetention(backupsDir, "backup_*.sql", 2);
        ApplyRetention(backupsDir, "pre_restore_*.sql", 2);
    }



    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    static string[] GetBackups(string dir)
    {
        if (!Directory.Exists(dir)) return new string[0];
        return Directory.GetFiles(dir, "backup_*.sql")
                        .OrderByDescending(f => new FileInfo(f).LastWriteTime)
                        .ToArray();
    }

    static void ApplyRetention(string dir, string pattern, int keep)
    {
        var files = Directory.GetFiles(dir, pattern)
                             .OrderByDescending(f => new FileInfo(f).LastWriteTime)
                             .ToArray();
        if (files.Length <= keep) return;
        foreach (var f in files.Skip(keep))
        {
            File.Delete(f);
            Console.WriteLine("  Eliminado por retencion: " + Path.GetFileName(f));
        }
    }

    static string ReadEnvVar(string envFile, string key)
    {
        if (!File.Exists(envFile)) throw new Exception("No existe el archivo: " + envFile);
        foreach (var line in File.ReadAllLines(envFile))
        {
            var m = Regex.Match(line, @"^" + Regex.Escape(key) + @"=(.*)$");
            if (m.Success) return m.Groups[1].Value.Trim();
        }
        throw new Exception("No se encontro la variable " + key + " en .env");
    }

    static int RunPowerShell(string workDir, string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName         = "powershell.exe",
            Arguments        = arguments,
            WorkingDirectory = workDir,
            UseShellExecute  = false,
            CreateNoWindow   = false,
        };
        using (var p = Process.Start(psi))
        {
            p.WaitForExit();
            return p.ExitCode;
        }
    }

    static void Info(string msg) { Console.ForegroundColor = ConsoleColor.Cyan;   Console.WriteLine(msg); Console.ResetColor(); }
    static void Ok(string msg)   { Console.ForegroundColor = ConsoleColor.Green;  Console.WriteLine(msg); Console.ResetColor(); }
    static void Warn(string msg) { Console.ForegroundColor = ConsoleColor.Yellow; Console.WriteLine(msg); Console.ResetColor(); }
    static void Error(string msg){ Console.ForegroundColor = ConsoleColor.Red;    Console.WriteLine("ERROR: " + msg); Console.ResetColor(); }
    static void Pause()          { Console.WriteLine("\nPresiona Enter para continuar..."); Console.ReadLine(); }
}

"""
Management command to export audit logs (T134).

Usage:
    python manage.py export_audit_log --output audit_export.json --format json
"""
import json
import os
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Export audit logs from structured log files to a single output file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default="audit_export.json",
            help="Output file path (default: audit_export.json)",
        )
        parser.add_argument(
            "--log-dir",
            type=str,
            default="/app/logs",
            help="Log directory path (default: /app/logs)",
        )
        parser.add_argument(
            "--format",
            type=str,
            choices=["json", "csv"],
            default="json",
            help="Output format (default: json)",
        )
        parser.add_argument(
            "--from-date",
            type=str,
            help="Filter logs from date (ISO format: YYYY-MM-DD)",
        )
        parser.add_argument(
            "--to-date",
            type=str,
            help="Filter logs to date (ISO format: YYYY-MM-DD)",
        )

    def handle(self, *args, **options):
        output_path = options["output"]
        log_dir = options["log_dir"]
        output_format = options["format"]
        from_date = options.get("from_date")
        to_date = options.get("to_date")

        # Verify log directory exists
        if not os.path.exists(log_dir):
            raise CommandError(f"Log directory not found: {log_dir}")

        # Collect all log files
        log_files = [
            "hallazgos.log",
            "porques_approval.log",
            "solicitudes_cambio.log",
            "chat_urgente.log",
            "notificaciones.log",
        ]

        events = []

        # Parse each log file
        for log_file in log_files:
            log_path = os.path.join(log_dir, log_file)
            if not os.path.exists(log_path):
                self.stdout.write(self.style.WARNING(f"Log file not found: {log_file}"))
                continue

            self.stdout.write(f"Reading {log_file}...")

            try:
                with open(log_path, "r", encoding="utf-8") as f:
                    for line_num, line in enumerate(f, 1):
                        try:
                            # Try to parse as JSON
                            if line.strip().startswith("{"):
                                event = json.loads(line)
                                
                                # Filter by date if specified
                                if from_date or to_date:
                                    event_date = event.get("timestamp", "")[:10]
                                    
                                    if from_date and event_date < from_date:
                                        continue
                                    if to_date and event_date > to_date:
                                        continue
                                
                                event["log_file"] = log_file
                                events.append(event)
                        except json.JSONDecodeError:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Failed to parse JSON in {log_file} line {line_num}"
                                )
                            )
                            continue
            except Exception as e:
                raise CommandError(f"Error reading {log_file}: {e}")

        # Sort by timestamp
        events.sort(key=lambda x: x.get("timestamp", ""))

        self.stdout.write(f"Collected {len(events)} events")

        # Write output
        try:
            if output_format == "json":
                self._write_json(output_path, events)
            elif output_format == "csv":
                self._write_csv(output_path, events)

            self.stdout.write(
                self.style.SUCCESS(f"✅ Audit log exported to: {output_path}")
            )
        except Exception as e:
            raise CommandError(f"Error writing output file: {e}")

    def _write_json(self, path, events):
        """Write events as JSON lines (one JSON object per line)."""
        with open(path, "w", encoding="utf-8") as f:
            for event in events:
                f.write(json.dumps(event) + "\n")

    def _write_csv(self, path, events):
        """Write events as CSV."""
        import csv

        if not events:
            self.stdout.write("No events to export")
            return

        # Get all unique keys from events
        all_keys = set()
        for event in events:
            all_keys.update(event.keys())

        fieldnames = sorted(list(all_keys))

        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for event in events:
                writer.writerow(event)

"""Configure the initial MySQL AUTO_INCREMENT value for Hallazgo IDs."""
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from apps.hallazgos.models import Hallazgo


class Command(BaseCommand):
    help = "Configure IDInicial for Hallazgo when it is greater than every existing ID"

    def handle(self, *args, **options):
        configured_value = os.environ.get("IDInicial", "").strip()
        if not configured_value:
            self.stdout.write("IDInicial no definido; se conserva la generación actual de IDs.")
            return

        if not configured_value.isdecimal() or int(configured_value) < 1:
            raise CommandError("IDInicial debe ser un número entero positivo.")

        if connection.vendor != "mysql":
            raise CommandError("La configuración de IDInicial requiere MySQL.")

        initial_id = int(configured_value)
        table_name = Hallazgo._meta.db_table
        id_column = Hallazgo._meta.pk.column
        quote_name = connection.ops.quote_name

        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT MAX({quote_name(id_column)}) "
                f"FROM {quote_name(table_name)}"
            )
            max_existing_id = cursor.fetchone()[0]

            if max_existing_id is not None and max_existing_id >= initial_id:
                self.stdout.write(
                    self.style.WARNING(
                        f"IDInicial={initial_id} no se aplicó: el ID máximo existente "
                        f"es {max_existing_id}."
                    )
                )
                return

            cursor.execute(
                "SELECT AUTO_INCREMENT "
                "FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s",
                [table_name],
            )
            current_next_id = cursor.fetchone()[0]
            if current_next_id is None:
                raise CommandError(
                    f"No se pudo consultar el AUTO_INCREMENT de {table_name}."
                )

            target_id = max(initial_id, current_next_id, (max_existing_id or 0) + 1)
            if target_id > current_next_id:
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} AUTO_INCREMENT = {target_id}"
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"El próximo ID de Hallazgo comenzará en {target_id}."
                    )
                )
            else:
                self.stdout.write(
                    f"El AUTO_INCREMENT actual ({current_next_id}) ya es igual o mayor "
                    f"que IDInicial ({initial_id}); no se modificó."
                )
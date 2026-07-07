"""
Management command: load_catalogs

Loads initial catalog data (sectors, subsecciones, tipos) into the database.

Usage:
    python manage.py load_catalogs

This command is idempotent — it will create catalogs if they don't exist,
or update them if they do. No duplicates will be created.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Load initial catalog data (sectors, subsecciones, tipos)"

    def handle(self, *args, **options):
        try:
            # Import models here to avoid circular imports
            from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog

            # Start a transaction
            with transaction.atomic():
                # Load Sectors
                sectors_data = [
                    {
                        "codigo": "RECLAMO_CLIENTE",
                        "nombre": "Reclamo Cliente",
                        "descripcion": "Hallazgos originados por reclamos de clientes",
                        "activo": True,
                    },
                    {
                        "codigo": "PROVEEDOR",
                        "nombre": "Proveedor",
                        "descripcion": "Hallazgos relacionados con proveedores",
                        "activo": True,
                    },
                    {
                        "codigo": "INTERNO",
                        "nombre": "Interno",
                        "descripcion": "Hallazgos internos de la organización",
                        "activo": True,
                    },
                ]

                for sector_data in sectors_data:
                    sector, created = SectorCatalog.objects.update_or_create(
                        codigo=sector_data["codigo"],
                        defaults={
                            "nombre": sector_data["nombre"],
                            "descripcion": sector_data["descripcion"],
                            "activo": sector_data["activo"],
                        },
                    )
                    status = "created" if created else "updated"
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Sector '{sector.nombre}' {status}"
                        )
                    )

                # Load Subsecciones (only for INTERNO sector)
                # FR-003 requires exactly these options for sector INTERNO.
                interno_sector = SectorCatalog.objects.get(codigo="INTERNO")
                subsecciones_data = [
                    {
                        "codigo": "ADMINISTRACION",
                        "nombre": "Administración",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "COMPRAS",
                        "nombre": "Compras",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "PRODUCCION",
                        "nombre": "Producción",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "INGENIERIA",
                        "nombre": "Ingeniería",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "VENTAS",
                        "nombre": "Ventas",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "POSTVENTAS",
                        "nombre": "Postventas",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "RRHH",
                        "nombre": "RRHH",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "SERVICIOS_TERCEROS",
                        "nombre": "Servicios de terceros",
                        "sector": interno_sector,
                    },
                    {
                        "codigo": "OTROS",
                        "nombre": "Otros",
                        "sector": interno_sector,
                    },
                ]

                expected_codes = set()
                for subsec_data in subsecciones_data:
                    expected_codes.add(subsec_data["codigo"])
                    subsec, created = SubsectionCatalog.objects.update_or_create(
                        codigo=subsec_data["codigo"],
                        sector=subsec_data["sector"],
                        defaults={"nombre": subsec_data["nombre"], "activo": True},
                    )
                    status = "created" if created else "updated"
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Subsección '{subsec.nombre}' (INTERNO) {status}"
                        )
                    )

                # Keep catalog deterministic with FR-003: deactivate legacy values
                # that are not part of the required list for INTERNO.
                deactivated = (
                    SubsectionCatalog.objects
                    .filter(sector=interno_sector)
                    .exclude(codigo__in=expected_codes)
                    .exclude(activo=False)
                    .update(activo=False)
                )
                if deactivated:
                    self.stdout.write(
                        self.style.WARNING(
                            f"! {deactivated} subsección(es) legacy de INTERNO desactivada(s) por FR-003"
                        )
                    )

                # Load Tipos (Hallazgo types)
                tipos_data = [
                    {
                        "codigo": "QUEJA_CLIENTE",
                        "nombre": "Queja Cliente",
                        "activo": True,
                    },
                    {
                        "codigo": "NO_CONFORMIDAD",
                        "nombre": "No Conformidad",
                        "activo": True,
                    },
                    {
                        "codigo": "OBSERVACION",
                        "nombre": "Observación",
                        "activo": True,
                    },
                    {
                        "codigo": "MEJORA_SUGERIDA",
                        "nombre": "Mejora Sugerida",
                        "activo": True,
                    },
                ]

                for tipo_data in tipos_data:
                    tipo, created = TipoCatalog.objects.update_or_create(
                        codigo=tipo_data["codigo"],
                        defaults={
                            "nombre": tipo_data["nombre"],
                            "activo": tipo_data["activo"],
                        },
                    )
                    status = "created" if created else "updated"
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Tipo '{tipo.nombre}' {status}"
                        )
                    )

                self.stdout.write(
                    self.style.SUCCESS("\n✓ All catalogs loaded successfully!")
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error loading catalogs: {str(e)}"))
            raise

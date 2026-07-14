#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.hallazgos.models import Hallazgo, HallazgoResponsable, HallazgoResponsableHistorial

print(f"Total hallazgos: {Hallazgo.objects.count()}")
print(f"Total asignaciones: {HallazgoResponsable.objects.count()}")
print(f"Total historiales: {HallazgoResponsableHistorial.objects.count()}")

print("\nPrimeros 5 hallazgos:")
for h in Hallazgo.objects.all()[:5]:
    print(f"  - Hallazgo {h.id}: {h.descripcion[:50]}")
    print(f"    Responsables: {h.responsables.count()}")

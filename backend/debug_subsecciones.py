#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.hallazgos.models import Hallazgo
from django.db.models import Count

print('Total Hallazgos:', Hallazgo.objects.count())
print('Hallazgos INTERNO:', Hallazgo.objects.filter(sector__codigo='INTERNO').count())

# Check the actual query
query = Hallazgo.objects.filter(sector__codigo='INTERNO').values('subseccion__nombre').annotate(count=Count('id')).order_by('-count')
print('\nSubsecciones query:')
for item in query:
    print(item)

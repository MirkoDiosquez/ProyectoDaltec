# Quickstart: Admin — Crear Quejas de Cliente

**Branch**: `002-admin-crear-quejas-cliente` | **Date**: 2026-06-16

**Prerequisites**: Spec 001 (fase 2 completa) debe estar implementada y ejecutándose. Ver [001-gestion-hallazgos/quickstart.md](../001-gestion-hallazgos/quickstart.md) para setup base.

---

## Setup

```bash
# El stack 001 debe estar corriendo
docker compose up -d

# Crear usuarios de prueba (si no existen)
docker compose exec backend python manage.py createsuperuser_admin \
  --dni 99999999 --nombre Admin --apellido Sistema --password admin123

docker compose exec backend python manage.py shell -c "
from apps.users.models import CustomUser, ClienteProfile
u = CustomUser.objects.create_user(username='cliente1', password='cli123',
    dni=11111111, nombre='Carlos', apellido='López',
    sexo='M', email='carlos@ejemplo.com', tipo='CLIENTE')
ClienteProfile.objects.create(user=u, empresa='EMPRESA_A')
print('Cliente creado:', u.id)
"
```

---

## Validation Scenarios

### VS-01 — Admin crea QUEJA_CLIENTE en nombre de un cliente

```bash
# 1. Login como Admin
ACCESS=$(curl -s -X POST http://localhost/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"dni": 99999999, "password": "admin123"}' | jq -r .access)

# 2. Obtener ID del cliente (reemplazar con el ID impreso en setup)
CLIENTE_ID=<id_del_cliente>

# 3. Crear QUEJA_CLIENTE
curl -s -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"descripcion\": \"Demoras en entrega reportadas por cliente.\",
       \"ubicacion\": \"Depósito Central\",
       \"tipo\": \"QUEJA_CLIENTE\",
       \"cliente_asociado\": $CLIENTE_ID}" | jq .
```

**Resultado esperado**:
```json
{
  "id": 1,
  "tipo": "QUEJA_CLIENTE",
  "estado": "APROBADO",
  "creado_por": { "tipo": "ADMIN" },
  "cliente_asociado": { "id": <CLIENTE_ID>, "tipo": "CLIENTE" }
}
```

**Verificar**: `estado = APROBADO` y `cliente_asociado` poblado con el cliente especificado.

---

### VS-02 — Admin intenta crear QUEJA_CLIENTE sin `cliente_asociado` → error 400

```bash
curl -s -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"descripcion": "Test", "ubicacion": "Planta", "tipo": "QUEJA_CLIENTE"}' | jq .
```

**Resultado esperado**:
```json
{ "cliente_asociado": ["Este campo es obligatorio cuando el tipo es QUEJA_CLIENTE y el creador es un Administrador."] }
```

**Verificar**: HTTP 400, campo `cliente_asociado` con mensaje de error.

---

### VS-03 — Admin intenta especificar un Empleado como `cliente_asociado` → error 400

```bash
# Crear un empleado primero
EMPLEADO_ID=$(docker compose exec backend python manage.py shell -c "
from apps.users.models import CustomUser, EmpleadoProfile
u = CustomUser.objects.create_user(username='emp1', password='emp123',
    dni=22222222, nombre='Ana', apellido='Torres',
    sexo='F', email='ana@empresa.com', tipo='EMPLEADO')
EmpleadoProfile.objects.create(user=u, sector='IT')
print(u.id)
" | tail -1)

curl -s -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"descripcion\": \"Test\", \"ubicacion\": \"Planta\",
       \"tipo\": \"QUEJA_CLIENTE\", \"cliente_asociado\": $EMPLEADO_ID}" | jq .
```

**Resultado esperado**:
```json
{ "cliente_asociado": ["El usuario especificado no existe o no es de tipo CLIENTE."] }
```

---

### VS-04 — Cliente crea QUEJA_CLIENTE directamente → `cliente_asociado` auto-rellenado

```bash
# Login como cliente
CLIENT_ACCESS=$(curl -s -X POST http://localhost/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"dni": 11111111, "password": "cli123"}' | jq -r .access)

curl -s -X POST http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $CLIENT_ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"descripcion": "No recibí el pedido.", "ubicacion": "Zona Norte",
       "tipo": "QUEJA_CLIENTE"}' | jq .
```

**Resultado esperado**: `estado = APROBADO`, `creado_por.tipo = CLIENTE`, `cliente_asociado.id = creado_por.id`.

---

### VS-05 — Cliente ve quejas creadas por Admin en su nombre

```bash
# Con el token del cliente (CLIENT_ACCESS del escenario VS-04)
curl -s http://localhost/api/v1/hallazgos/ \
  -H "Authorization: Bearer $CLIENT_ACCESS" | jq '.results[] | {id, tipo, estado, creado_por: .creado_por.tipo, cliente_asociado: .cliente_asociado.tipo}'
```

**Resultado esperado**: La lista incluye la queja creada en VS-01 (por el Admin). El cliente puede ver quejas donde es `cliente_asociado` aunque `creado_por` sea el Admin.

---

### VS-06 — Trazabilidad: detalle muestra `creado_por` (Admin) y `cliente_asociado` (Cliente)

```bash
# Reemplazar 1 con el ID obtenido en VS-01
curl -s http://localhost/api/v1/hallazgos/1/ \
  -H "Authorization: Bearer $ACCESS" | jq '{creado_por: .creado_por, cliente_asociado: .cliente_asociado}'
```

**Resultado esperado**:
```json
{
  "creado_por": { "tipo": "ADMIN" },
  "cliente_asociado": { "tipo": "CLIENTE" }
}
```

---

### VS-07 — Admin NO recibe notificación de su propia queja; otros Admins sí

Requiere múltiples Admins en el sistema. Si solo existe un Admin, verificar que no se genera ninguna notificación en `apps_notificacion` para el Admin creador:

```bash
docker compose exec backend python manage.py shell -c "
from apps.notificaciones.models import Notificacion
from apps.users.models import CustomUser
admin = CustomUser.objects.get(dni=99999999)
count = Notificacion.objects.filter(destinatario=admin).count()
print(f'Notificaciones para el Admin creador: {count}')  # debe ser 0
"
```

---

### VS-08 — `cliente_asociado` es inmutable: intento de PATCH rechazado

```bash
# Intentar modificar cliente_asociado de la queja creada en VS-01
curl -s -X PATCH http://localhost/api/v1/hallazgos/1/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"cliente_asociado\": 999}" | jq .
```

**Resultado esperado**: HTTP 400 con mensaje indicando que el campo es inmutable, o el campo es ignorado silenciosamente (el valor en BD no cambia). Verificar con GET que `cliente_asociado` sigue siendo el original.

"""
User models for ProyectoDaltec.

CustomUser extends AbstractUser replacing username with DNI as the unique identifier.
Role-specific data lives in separate OneToOne profile models (EmpleadoProfile, ClienteProfile)
to keep the base user table lean and avoid nullable columns for role-specific fields.

Refs: FR-001, FR-002, FR-003, data-model.md
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserTipo(models.TextChoices):
    ADMIN = "ADMIN", "Administrador"
    EMPLEADO = "EMPLEADO", "Empleado"
    CLIENTE = "CLIENTE", "Cliente"


class Sexo(models.TextChoices):
    MASCULINO = "M", "Masculino"
    FEMENINO = "F", "Femenino"
    OTRO = "O", "Otro"


class Empresa(models.TextChoices):
    EMPRESA_A = "EMPRESA_A", "Empresa A"
    EMPRESA_B = "EMPRESA_B", "Empresa B"
    EMPRESA_C = "EMPRESA_C", "Empresa C"


class CustomUser(AbstractUser):
    """
    System user. DNI is the login identifier; username field is kept for
    Django internals but not exposed to end users.

    FR-002: Authentication via DNI + password.
    FR-003: DNI must be unique across the system.
    """

    # Remove first_name / last_name from AbstractUser — we use nombre / apellido
    first_name = None  # type: ignore[assignment]
    last_name = None   # type: ignore[assignment]

    dni = models.BigIntegerField(
        unique=True,
        verbose_name="DNI",
        help_text="Documento Nacional de Identidad — usado como identificador de login.",
    )
    nombre = models.CharField(max_length=100, verbose_name="Nombre")
    apellido = models.CharField(max_length=100, verbose_name="Apellido")
    sexo = models.CharField(
        max_length=1,
        choices=Sexo.choices,
        verbose_name="Sexo",
    )
    email = models.EmailField(verbose_name="Correo electrónico")
    tipo = models.CharField(
        max_length=10,
        choices=UserTipo.choices,
        verbose_name="Tipo de usuario",
    )

    # Django internals — not used for login
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["dni", "nombre", "apellido", "email", "tipo"]

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self) -> str:
        return f"{self.nombre} {self.apellido} (DNI: {self.dni})"

    @property
    def is_admin(self) -> bool:
        return self.tipo == UserTipo.ADMIN

    @property
    def is_empleado(self) -> bool:
        return self.tipo == UserTipo.EMPLEADO

    @property
    def is_cliente(self) -> bool:
        return self.tipo == UserTipo.CLIENTE


class EmpleadoProfile(models.Model):
    """
    Extra data for users with tipo=EMPLEADO.
    Created automatically when a EMPLEADO user is created.
    """

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="empleado_profile",
        verbose_name="Usuario",
    )
    sector = models.CharField(max_length=100, verbose_name="Sector")

    class Meta:
        verbose_name = "Perfil de Empleado"
        verbose_name_plural = "Perfiles de Empleados"

    def __str__(self) -> str:
        return f"Empleado: {self.user} — {self.sector}"


class ClienteProfile(models.Model):
    """
    Extra data for users with tipo=CLIENTE.
    Created automatically when a CLIENTE user is created.

    Empresa is a closed catalogue (Assumption: fixed set of companies).
    """

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="cliente_profile",
        verbose_name="Usuario",
    )
    empresa = models.CharField(
        max_length=50,
        choices=Empresa.choices,
        verbose_name="Empresa",
    )

    class Meta:
        verbose_name = "Perfil de Cliente"
        verbose_name_plural = "Perfiles de Clientes"

    def __str__(self) -> str:
        return f"Cliente: {self.user} — {self.empresa}"

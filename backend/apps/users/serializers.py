from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.catalogos.models import SubsectionCatalog
from apps.users.models import ClienteProfile, EmpleadoProfile, UserTipo

User = get_user_model()


def _validate_empleado_sector_codigo(sector_value):
    sector_codigo = str(sector_value or "").strip()
    if not sector_codigo:
        raise serializers.ValidationError("El sector es requerido para usuarios EMPLEADO.")

    exists = SubsectionCatalog.objects.filter(
        codigo=sector_codigo,
        activo=True,
        sector__codigo="INTERNO",
        sector__activo=True,
    ).exists()
    if not exists:
        raise serializers.ValidationError(
            "El sector debe pertenecer al catálogo de subsecciones activas de INTERNO."
        )

    return sector_codigo


class UsuarioSimpleSerializer(serializers.ModelSerializer):
    """
    Simple user serializer for responsable management (T091).
    Includes computed field es_responsable_de_hallazgo to indicate current status.
    
    Context must include:
    - hallazgo_id: The hallazgo ID to check responsable status for
    """
    es_responsable_de_hallazgo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nombre", "apellido", "tipo", "es_responsable_de_hallazgo"]
        read_only_fields = fields

    def get_es_responsable_de_hallazgo(self, obj):
        """
        Check if user is a responsable of the hallazgo passed in context (T091).
        """
        hallazgo_id = self.context.get("hallazgo_id")
        if not hallazgo_id:
            return False
        
        # Import here to avoid circular imports
        from apps.hallazgos.models import Hallazgo
        try:
            hallazgo = Hallazgo.objects.get(id=hallazgo_id)
            return hallazgo.responsables.filter(id=obj.id).exists()
        except Hallazgo.DoesNotExist:
            return False


class UserListSerializer(serializers.ModelSerializer):
    sector = serializers.SerializerMethodField()
    empresa = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "dni",
            "nombre",
            "apellido",
            "email",
            "tipo",
            "is_active",
            "sector",
            "empresa",
        ]
        read_only_fields = fields

    def get_sector(self, obj):
        if hasattr(obj, "empleado_profile"):
            return obj.empleado_profile.sector
        return None

    def get_empresa(self, obj):
        if hasattr(obj, "cliente_profile"):
            return obj.cliente_profile.empresa
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    sector = serializers.SerializerMethodField()
    empresa = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "dni",
            "nombre",
            "apellido",
            "sexo",
            "email",
            "tipo",
            "is_active",
            "sector",
            "empresa",
        ]
        read_only_fields = fields

    def get_sector(self, obj):
        if hasattr(obj, "empleado_profile"):
            return obj.empleado_profile.sector
        return None

    def get_empresa(self, obj):
        if hasattr(obj, "cliente_profile"):
            return obj.cliente_profile.empresa
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    sector = serializers.CharField(required=False, write_only=True)
    empresa = serializers.ChoiceField(
        choices=ClienteProfile._meta.get_field("empresa").choices,
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "dni",
            "nombre",
            "apellido",
            "sexo",
            "email",
            "password",
            "tipo",
            "sector",
            "empresa",
        ]
        read_only_fields = ["id"]

    def validate_dni(self, value):
        if User.objects.filter(dni=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese DNI.")
        return value

    def validate(self, attrs):
        tipo = attrs.get("tipo")
        sector = attrs.get("sector")
        empresa = attrs.get("empresa")

        if tipo == UserTipo.EMPLEADO:
            try:
                attrs["sector"] = _validate_empleado_sector_codigo(sector)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"sector": exc.detail})

        if tipo == UserTipo.CLIENTE and not empresa:
            raise serializers.ValidationError(
                {"empresa": "La empresa es requerida para usuarios CLIENTE."}
            )

        if tipo == UserTipo.ADMIN and (sector or empresa):
            raise serializers.ValidationError(
                "Los usuarios ADMIN no deben incluir sector ni empresa."
            )

        if tipo == UserTipo.EMPLEADO and empresa:
            raise serializers.ValidationError(
                {"empresa": "Empresa solo aplica a usuarios CLIENTE."}
            )

        if tipo == UserTipo.CLIENTE and sector:
            raise serializers.ValidationError(
                {"sector": "Sector solo aplica a usuarios EMPLEADO."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        sector = validated_data.pop("sector", None)
        empresa = validated_data.pop("empresa", None)

        user = User(**validated_data)
        user.username = str(user.dni)
        user.set_password(password)
        user.save()

        if user.tipo == UserTipo.EMPLEADO:
            EmpleadoProfile.objects.create(user=user, sector=sector)
        elif user.tipo == UserTipo.CLIENTE:
            ClienteProfile.objects.create(user=user, empresa=empresa)

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password_confirmacion = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        required=False,
        min_length=6,
    )
    sector = serializers.CharField(required=False, allow_blank=True)
    empresa = serializers.ChoiceField(
        choices=ClienteProfile._meta.get_field("empresa").choices,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "dni",
            "nombre",
            "apellido",
            "sexo",
            "email",
            "tipo",
            "sector",
            "empresa",
            "new_password",
            "password_confirmacion",
        ]

    def validate_dni(self, value):
        queryset = User.objects.filter(dni=value).exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un usuario con ese DNI.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        instance = self.instance

        password_confirmacion = attrs.get("password_confirmacion")
        if not actor or not actor.check_password(password_confirmacion):
            raise serializers.ValidationError(
                {"password_confirmacion": "La contraseña de confirmación es inválida."}
            )

        if actor.pk != instance.pk and getattr(instance, "is_admin", False):
            raise serializers.ValidationError(
                "Un administrador no puede editar el perfil ni el rol de otro administrador."
            )

        final_tipo = attrs.get("tipo", instance.tipo)
        sector = attrs.get("sector", serializers.empty)
        empresa = attrs.get("empresa", serializers.empty)

        if not getattr(actor, "is_admin", False) and final_tipo != instance.tipo:
            raise serializers.ValidationError(
                {"tipo": "Solo un administrador puede cambiar roles."}
            )

        if final_tipo == UserTipo.EMPLEADO:
            current_sector = (
                instance.empleado_profile.sector
                if hasattr(instance, "empleado_profile")
                else None
            )
            provided_sector = None if sector is serializers.empty else str(sector).strip()
            if not provided_sector and not current_sector:
                raise serializers.ValidationError(
                    {"sector": "El sector es requerido para usuarios EMPLEADO."}
                )
            if provided_sector:
                try:
                    attrs["sector"] = _validate_empleado_sector_codigo(provided_sector)
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({"sector": exc.detail})
            elif current_sector:
                try:
                    _validate_empleado_sector_codigo(current_sector)
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({"sector": exc.detail})

        if final_tipo == UserTipo.CLIENTE:
            current_empresa = (
                instance.cliente_profile.empresa
                if hasattr(instance, "cliente_profile")
                else None
            )
            if empresa is serializers.empty and not current_empresa:
                raise serializers.ValidationError(
                    {"empresa": "La empresa es requerida para usuarios CLIENTE."}
                )

        if final_tipo == UserTipo.ADMIN:
            if sector is not serializers.empty and str(sector).strip():
                raise serializers.ValidationError(
                    {"sector": "Los usuarios ADMIN no deben incluir sector."}
                )
            if empresa is not serializers.empty and empresa is not None:
                raise serializers.ValidationError(
                    {"empresa": "Los usuarios ADMIN no deben incluir empresa."}
                )

        if final_tipo == UserTipo.EMPLEADO and empresa is not serializers.empty and empresa is not None:
            raise serializers.ValidationError(
                {"empresa": "Empresa solo aplica a usuarios CLIENTE."}
            )

        if final_tipo == UserTipo.CLIENTE and sector is not serializers.empty and str(sector).strip():
            raise serializers.ValidationError(
                {"sector": "Sector solo aplica a usuarios EMPLEADO."}
            )

        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        new_password = validated_data.pop("new_password", None)
        validated_data.pop("password_confirmacion", None)
        sector = validated_data.pop("sector", serializers.empty)
        empresa = validated_data.pop("empresa", serializers.empty)

        original_tipo = instance.tipo

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if "dni" in validated_data:
            instance.username = str(instance.dni)

        if new_password:
            instance.set_password(new_password)

        instance.save()

        final_tipo = instance.tipo

        if final_tipo == UserTipo.EMPLEADO:
            sector_value = (
                str(sector).strip()
                if sector is not serializers.empty
                else (
                    instance.empleado_profile.sector
                    if hasattr(instance, "empleado_profile")
                    else ""
                )
            )
            EmpleadoProfile.objects.update_or_create(
                user=instance,
                defaults={"sector": sector_value},
            )
            if hasattr(instance, "cliente_profile"):
                instance.cliente_profile.delete()
        elif final_tipo == UserTipo.CLIENTE:
            empresa_value = (
                empresa
                if empresa is not serializers.empty
                else (
                    instance.cliente_profile.empresa
                    if hasattr(instance, "cliente_profile")
                    else None
                )
            )
            ClienteProfile.objects.update_or_create(
                user=instance,
                defaults={"empresa": empresa_value},
            )
            if hasattr(instance, "empleado_profile"):
                instance.empleado_profile.delete()
        else:
            if hasattr(instance, "empleado_profile"):
                instance.empleado_profile.delete()
            if hasattr(instance, "cliente_profile"):
                instance.cliente_profile.delete()

        if original_tipo != final_tipo:
            instance.refresh_from_db()

        return instance

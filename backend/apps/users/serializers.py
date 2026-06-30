from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.users.models import ClienteProfile, EmpleadoProfile, UserTipo

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "dni", "nombre", "apellido", "tipo"]
        read_only_fields = fields


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

        if tipo == UserTipo.EMPLEADO and not sector:
            raise serializers.ValidationError(
                {"sector": "El sector es requerido para usuarios EMPLEADO."}
            )

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

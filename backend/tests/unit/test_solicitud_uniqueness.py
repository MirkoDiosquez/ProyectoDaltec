"""Unit tests for solicitud uniqueness constraint (T116)."""
import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from apps.hallazgos.models import Hallazgo
from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.users.models import EmpleadoProfile

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="pass123",
        tipo="ADMIN",
        nombre="Admin",
        apellido="User",
        dni=111111,
    )


@pytest.fixture
def responsable_user(db):
    user = User.objects.create_user(
        username="responsable",
        email="responsable@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Responsable",
        apellido="User",
        dni=222222,
    )
    EmpleadoProfile.objects.create(user=user, sector="RRHH")
    return user


@pytest.fixture
def other_user(db):
    user = User.objects.create_user(
        username="other",
        email="other@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Other",
        apellido="User",
        dni=333333,
    )
    EmpleadoProfile.objects.create(user=user, sector="OPERACIONES")
    return user


@pytest.fixture
def hallazgo(db, admin_user, responsable_user):
    """Create a hallazgo with a responsable."""
    h = Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test description",
        estado="APROBADO",
        creado_por=admin_user,
    )
    h.responsables.add(responsable_user)
    return h


@pytest.mark.django_db
class TestSolicitudUniqueness:
    """Unit tests for solicitud uniqueness constraint (T116, T109)."""

    def test_cannot_create_duplicate_pending_solicitud(
        self, hallazgo, responsable_user, other_user
    ):
        """Test: Cannot create 2nd pending solicitud from same responsable for same hallazgo (T116, T109)."""
        # Create first solicitud
        SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
            estado="pendiente",
        )

        # Try to create second solicitud from same responsable (should fail in service layer)
        from apps.solicitud_cambio_responsable.services import SolicitudCambioResponsableService
        
        with pytest.raises(ValidationError):
            SolicitudCambioResponsableService.create(
                hallazgo=hallazgo,
                solicitante=responsable_user,
                tipo="cambiar",
                usuario_propuesto=other_user,
            )

    def test_can_create_solicitud_after_first_is_approved(
        self, hallazgo, responsable_user, other_user, admin_user
    ):
        """Test: Can create new solicitud after first one is approved (T116, T109)."""
        # Create and approve first solicitud
        solicitud1 = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
            estado="pendiente",
        )
        solicitud1.approve(admin_user)
        
        # Another user for second solicitud
        another_user = User.objects.create_user(
            username="another",
            email="another@test.com",
            password="pass123",
            tipo="EMPLEADO",
            nombre="Another",
            apellido="User",
            dni=444444,
        )

        # Now create second solicitud
        from apps.solicitud_cambio_responsable.services import SolicitudCambioResponsableService
        
        solicitud2 = SolicitudCambioResponsableService.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=another_user,
        )
        
        assert solicitud2.id is not None
        assert solicitud2.estado == "pendiente"

    def test_can_create_solicitud_after_first_is_rejected(
        self, hallazgo, responsable_user, other_user, admin_user
    ):
        """Test: Can create new solicitud after first one is rejected (T116, T109)."""
        # Create and reject first solicitud
        solicitud1 = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
            estado="pendiente",
        )
        solicitud1.reject(admin_user, "Not appropriate")
        
        # Now create second solicitud
        from apps.solicitud_cambio_responsable.services import SolicitudCambioResponsableService
        
        solicitud2 = SolicitudCambioResponsableService.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
        )
        
        assert solicitud2.id is not None
        assert solicitud2.estado == "pendiente"

    def test_multiple_responsables_can_have_pending_solicitudes(
        self, hallazgo, responsable_user, admin_user, other_user
    ):
        """Test: Multiple responsables can each have one pending solicitud (T116, T109)."""
        # Add another responsable
        responsable2 = User.objects.create_user(
            username="responsable2",
            email="responsable2@test.com",
            password="pass123",
            tipo="EMPLEADO",
            nombre="Responsable2",
            apellido="User",
            dni=555555,
        )
        EmpleadoProfile.objects.create(user=responsable2, sector="RRHH")
        hallazgo.responsables.add(responsable2)
        
        # Create solicitud from first responsable
        sol1 = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
            estado="pendiente",
        )
        
        # Create solicitud from second responsable
        sol2 = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable2,
            tipo="agregar",
            usuario_propuesto=other_user,
            estado="pendiente",
        )
        
        # Both should exist
        assert sol1.id is not None
        assert sol2.id is not None
        assert SolicitudCambioResponsable.objects.filter(
            hallazgo=hallazgo,
            estado="pendiente"
        ).count() == 2

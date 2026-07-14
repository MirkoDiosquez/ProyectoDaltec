"""
Test script for automated tasks.

This script tests:
1. Cleanup of old notifications
2. Database backup functionality
3. Responsable history tracking

Usage:
    python manage.py shell < tests/automation/test_automation.py
    
Or from django shell:
    python manage.py shell
    >>> exec(open('tests/automation/test_automation.py').read())
"""
import os
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.notificaciones.models import Notificacion
from apps.hallazgos.models import Hallazgo, HallazgoResponsable, HallazgoResponsableHistorial
from apps.hallazgos.services import asignar_responsable, remover_responsable

User = get_user_model()


def test_cleanup_old_notifications():
    """Test cleanup of notifications read more than 15 days ago."""
    print("\n" + "=" * 60)
    print("TEST 1: Cleanup Old Notifications")
    print("=" * 60)
    
    # Create a test user for destinatario
    test_user = User.objects.filter(email='notif_test@test.com').first()
    if not test_user:
        test_user = User.objects.create_user(
            email='notif_test@test.com',
            username='notif_test',
            password='test123',
            dni='00000000',
        )
    
    # Create old notification (created 20 days ago)
    old_date = timezone.now() - timedelta(days=20)
    old_notif = Notificacion.objects.create(
        titulo="Old Notification",
        mensaje="This should be cleaned up",
        leida=True,
        destinatario=test_user,
    )
    # Manually set fecha to old date
    old_notif.fecha = old_date
    old_notif.save()
    print(f"✓ Created old notification (ID: {old_notif.id}, fecha: {old_date})")
    
    # Create recent notification (created 5 days ago)
    recent_date = timezone.now() - timedelta(days=5)
    recent_notif = Notificacion.objects.create(
        titulo="Recent Notification",
        mensaje="This should NOT be cleaned up",
        leida=True,
        destinatario=test_user,
    )
    # Manually set fecha to recent date
    recent_notif.fecha = recent_date
    recent_notif.save()
    print(f"✓ Created recent notification (ID: {recent_notif.id}, fecha: {recent_date})")
    
    # Count before cleanup
    before = Notificacion.objects.filter(leida=True).count()
    print(f"\nBefore cleanup: {before} read notifications")
    
    # Run cleanup
    cutoff_date = timezone.now() - timedelta(days=15)
    old_notifications = Notificacion.objects.filter(
        leida=True,
        fecha__lt=cutoff_date,
    )
    count_deleted = old_notifications.count()
    old_notifications.delete()
    
    print(f"Cleanup deleted: {count_deleted} notifications")
    
    # Verify old notification is gone
    old_exists = Notificacion.objects.filter(id=old_notif.id).exists()
    recent_exists = Notificacion.objects.filter(id=recent_notif.id).exists()
    
    print(f"\nOld notification exists: {old_exists} (should be False) ✓" if not old_exists else f"✗ Old notification still exists")
    print(f"Recent notification exists: {recent_exists} (should be True) ✓" if recent_exists else f"✗ Recent notification was deleted")
    
    # Cleanup
    recent_notif.delete()
    
    return not old_exists and recent_exists


def test_backup_database():
    """Test database backup functionality."""
    print("\n" + "=" * 60)
    print("TEST 2: Database Backup")
    print("=" * 60)
    
    import subprocess
    from pathlib import Path
    
    backup_dir = "/tmp/test_backups"
    Path(backup_dir).mkdir(exist_ok=True)
    
    print(f"Backup directory: {backup_dir}")
    
    try:
        # Run backup command
        from django.core.management import call_command
        call_command('backup_database', backup_dir=backup_dir)
        
        # Check if backup file was created
        backup_files = list(Path(backup_dir).glob('backup_*.sql'))
        print(f"✓ Backup files created: {len(backup_files)}")
        
        if backup_files:
            latest = sorted(backup_files, key=lambda p: p.stat().st_mtime, reverse=True)[0]
            size_mb = latest.stat().st_size / (1024 * 1024)
            print(f"  Latest backup: {latest.name} ({size_mb:.2f} MB)")
        
        # Verify only 2 backups are kept
        if len(backup_files) <= 2:
            print(f"✓ Correct number of backups (max 2): {len(backup_files)}")
            return True
        else:
            print(f"✗ Too many backups: {len(backup_files)}")
            return False
            
    except Exception as e:
        print(f"✗ Backup failed: {str(e)}")
        return False


def test_responsable_history():
    """Test responsable assignment/removal history tracking."""
    print("\n" + "=" * 60)
    print("TEST 3: Responsable History Tracking")
    print("=" * 60)
    
    try:
        # Get or create a test admin user
        admin = User.objects.filter(tipo='ADMIN').first()
        if not admin:
            admin = User.objects.create_user(
                email='admin_test@test.com',
                username='admin_test',
                password='test123',
                dni='11111111',
                nombre='Admin',
                apellido='Test',
                tipo='ADMIN',
                sexo='M'
            )
            print(f"✓ Created test admin: {admin.email}")
        else:
            print(f"✓ Using existing admin: {admin.email}")
        
        # Get or create a test empleado user
        empleado = User.objects.filter(tipo='EMPLEADO').first()
        if not empleado:
            empleado = User.objects.create_user(
                email='empleado_test@test.com',
                username='empleado_test',
                password='test123',
                dni='22222222',
                nombre='Empleado',
                apellido='Test',
                tipo='EMPLEADO',
                sexo='M'
            )
            print(f"✓ Created test empleado: {empleado.email}")
        else:
            print(f"✓ Using existing empleado: {empleado.email}")
        
        # Create a NEW hallazgo for this test (don't reuse existing ones)
        hallazgo = Hallazgo.objects.create(
            descripcion="Test Hallazgo for History",
            ubicacion="Test Location",
            tipo="NO_CONFORMIDAD",
            estado="APROBADO",
            creado_por=admin,
        )
        print(f"✓ Created new test hallazgo: {hallazgo.id}")
        
        # Test: Assign responsable
        try:
            result = asignar_responsable(hallazgo, admin, empleado)
            print(f"\n✓ asignar_responsable returned: {result}")
        except Exception as e:
            print(f"✗ asignar_responsable failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print(f"✓ Assigned responsable: {empleado.email} to Hallazgo {hallazgo.id}")
        
        # Check history record created
        history = HallazgoResponsableHistorial.objects.filter(
            hallazgo=hallazgo,
            responsable=empleado,
        ).first()
        
        print(f"\nHistory record check: {history}")
        if history:
            print(f"  - ID: {history.id}")
            print(f"  - Hallazgo: {history.hallazgo_id}")
            print(f"  - Responsable: {history.responsable_id}")
            print(f"  - fecha_asignacion: {history.fecha_asignacion}")
            print(f"  - fecha_remocion: {history.fecha_remocion}")
        
        if history and not history.fecha_remocion:
            print(f"✓ History record created (ACTIVE)")
            print(f"  Assigned: {history.fecha_asignacion}")
        else:
            print(f"✗ History record not created correctly")
            return False
        
        # Test: Remove responsable
        try:
            result = remover_responsable(hallazgo, admin, empleado)
            print(f"\n✓ remover_responsable returned: {result}")
        except Exception as e:
            print(f"✗ remover_responsable failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        
        print(f"✓ Removed responsable: {empleado.email} from Hallazgo {hallazgo.id}")
        
        # Check history record updated
        history.refresh_from_db()
        if history.fecha_remocion:
            print(f"✓ History record updated (REMOVED)")
            print(f"  Removed: {history.fecha_remocion}")
        else:
            print(f"✗ History record not updated correctly")
            return False
        
        # Show audit trail
        print(f"\nAudit trail for Hallazgo {hallazgo.id}:")
        for record in HallazgoResponsableHistorial.objects.filter(hallazgo=hallazgo):
            status = "ACTIVE" if not record.fecha_remocion else "REMOVED"
            print(f"  - {record.responsable} [{status}]")
            print(f"    Assigned: {record.fecha_asignacion}")
            if record.fecha_remocion:
                print(f"    Removed: {record.fecha_remocion}")
        
        # Cleanup
        hallazgo.delete()
        
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__" or True:  # Always run when imported
    print("\n" + "=" * 60)
    print("AUTOMATED TASKS TEST SUITE")
    print("=" * 60)
    
    results = {
        "Cleanup Old Notifications": test_cleanup_old_notifications(),
        "Database Backup": test_backup_database(),
        "Responsable History": test_responsable_history(),
    }
    
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    print("=" * 60)

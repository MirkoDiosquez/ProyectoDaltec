"""
Management command to create an initial ADMIN user with CLI arguments.

Usage:
    python manage.py createsuperuser_admin --dni 12345678 --nombre John --apellido Doe --password secret123

Or interactively:
    python manage.py createsuperuser_admin
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError

from apps.users.models import CustomUser, EmpleadoProfile


class Command(BaseCommand):
    """Create an initial ADMIN user from CLI arguments."""

    help = "Create an initial ADMIN user with provided arguments or interactively"

    def add_arguments(self, parser):
        """Define command-line arguments."""
        parser.add_argument(
            "--dni",
            type=int,
            help="DNI of the admin user (unique)",
        )
        parser.add_argument(
            "--nombre",
            type=str,
            help="First name of the admin user",
        )
        parser.add_argument(
            "--apellido",
            type=str,
            help="Last name of the admin user",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="Password for the admin user",
        )
        parser.add_argument(
            "--email",
            type=str,
            default="admin@local.test",
            help="Email address (default: admin@local.test)",
        )
        parser.add_argument(
            "--sexo",
            type=str,
            default="M",
            choices=["M", "F", "O"],
            help="Gender: M (Masculino), F (Femenino), O (Otro) [default: M]",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        # Get arguments or prompt interactively
        dni = options.get("dni")
        nombre = options.get("nombre")
        apellido = options.get("apellido")
        password = options.get("password")
        email = options.get("email")
        sexo = options.get("sexo")

        # If any required argument is missing, prompt interactively
        if not dni:
            dni = self._prompt_for_input("DNI", input_type=int)
        if not nombre:
            nombre = self._prompt_for_input("First name (nombre)")
        if not apellido:
            apellido = self._prompt_for_input("Last name (apellido)")
        if not password:
            password = self._prompt_for_password()

        # Validate inputs
        if not nombre or not apellido or not password:
            raise CommandError("nombre, apellido, and password are required")

        if dni <= 0:
            raise CommandError("DNI must be a positive integer")

        if sexo not in ["M", "F", "O"]:
            raise CommandError(f"Invalid sexo value. Choose from: M, F, O")

        # Check if user already exists
        if CustomUser.objects.filter(dni=dni).exists():
            raise CommandError(f"Admin user with DNI {dni} already exists")

        # Create the admin user
        try:
            username = f"admin_{dni}"  # Generate unique username based on DNI
            user = CustomUser.objects.create_user(
                username=username,
                dni=dni,
                nombre=nombre,
                apellido=apellido,
                email=email,
                password=password,
                sexo=sexo,
                tipo="ADMIN",
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Admin user '{nombre} {apellido}' (DNI: {dni}) created successfully"
                )
            )
            self.stdout.write(f"  Username: {username}")
            self.stdout.write(f"  Email: {email}")
            self.stdout.write(f"  Type: ADMIN")

        except IntegrityError as e:
            raise CommandError(f"Error creating user: {str(e)}")
        except Exception as e:
            raise CommandError(f"Unexpected error: {str(e)}")

    def _prompt_for_input(self, label, input_type=str):
        """Prompt user for input."""
        while True:
            try:
                value = input(f"{label}: ").strip()
                if not value:
                    self.stdout.write(self.style.ERROR(f"  {label} cannot be empty"))
                    continue
                if input_type == int:
                    return int(value)
                return value
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f"  Invalid {label.lower()}. Please enter a valid value.")
                )

    def _prompt_for_password(self):
        """Prompt user for password (hidden input)."""
        import getpass

        while True:
            password = getpass.getpass("Password: ")
            if not password:
                self.stdout.write(self.style.ERROR("  Password cannot be empty"))
                continue
            if len(password) < 8:
                self.stdout.write(
                    self.style.ERROR("  Password must be at least 8 characters long")
                )
                continue
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                self.stdout.write(self.style.ERROR("  Passwords do not match"))
                continue
            return password

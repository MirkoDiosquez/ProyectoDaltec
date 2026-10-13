from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError


COMMAND_CONNECTION = (
    "apps.hallazgos.management.commands.configurar_id_inicial_hallazgo.connection"
)


def make_mysql_connection(max_existing_id, current_next_id):
    cursor = MagicMock()
    cursor.fetchone.side_effect = [(max_existing_id,), (current_next_id,)]
    cursor_context = MagicMock()
    cursor_context.__enter__.return_value = cursor

    mock_connection = MagicMock()
    mock_connection.vendor = "mysql"
    mock_connection.ops.quote_name.side_effect = lambda name: f"`{name}`"
    mock_connection.cursor.return_value = cursor_context
    return mock_connection, cursor


def test_configures_starting_id_when_greater_than_max(monkeypatch):
    monkeypatch.setenv("IDInicial", "1000")
    mock_connection, cursor = make_mysql_connection(25, 26)

    with patch(COMMAND_CONNECTION, mock_connection):
        call_command("configurar_id_inicial_hallazgo", stdout=StringIO())

    assert cursor.execute.call_count == 3
    assert "AUTO_INCREMENT = 1000" in cursor.execute.call_args.args[0]


@pytest.mark.parametrize("max_existing_id", [1000, 1001])
def test_does_not_change_start_when_max_id_is_equal_or_greater(
    monkeypatch, max_existing_id
):
    monkeypatch.setenv("IDInicial", "1000")
    mock_connection, cursor = make_mysql_connection(max_existing_id, max_existing_id + 1)

    with patch(COMMAND_CONNECTION, mock_connection):
        call_command("configurar_id_inicial_hallazgo", stdout=StringIO())

    assert cursor.execute.call_count == 1


def test_does_not_lower_existing_auto_increment(monkeypatch):
    monkeypatch.setenv("IDInicial", "1000")
    mock_connection, cursor = make_mysql_connection(25, 1500)

    with patch(COMMAND_CONNECTION, mock_connection):
        call_command("configurar_id_inicial_hallazgo", stdout=StringIO())

    assert cursor.execute.call_count == 2


def test_unset_start_leaves_allocator_unchanged(monkeypatch):
    monkeypatch.delenv("IDInicial", raising=False)

    with patch(COMMAND_CONNECTION) as mock_connection:
        call_command("configurar_id_inicial_hallazgo", stdout=StringIO())

    mock_connection.cursor.assert_not_called()


@pytest.mark.parametrize("configured_value", ["abc", "0", "-5", "1.5"])
def test_rejects_invalid_starting_id(monkeypatch, configured_value):
    monkeypatch.setenv("IDInicial", configured_value)

    with pytest.raises(CommandError, match="entero positivo"):
        call_command("configurar_id_inicial_hallazgo", stdout=StringIO())
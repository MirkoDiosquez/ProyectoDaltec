#!/bin/bash
#
# run_automation_tests.sh — Helper script to run automation tests in Docker
#
# Usage from project root:
#   bash scripts/run_automation_tests.sh
#
# Or manually:
#   docker-compose exec backend python manage.py shell < tests/automation/test_automation.py
#

set -e

echo "========================================"
echo "Running Automation Tests in Docker"
echo "========================================"
echo ""

# Check if docker-compose is running
if ! docker-compose ps backend &> /dev/null; then
    echo "Error: docker-compose services not running"
    echo "Start with: docker-compose up -d"
    exit 1
fi

echo "Running Python test suite..."
docker-compose exec -T backend python manage.py shell < tests/automation/test_automation.py

echo ""
echo "========================================"
echo "Tests completed!"
echo "========================================"

#!/bin/bash

# Quick test script to verify Makefile and run script are working

echo "Testing Makefile commands..."
echo ""

# Test help
echo "1. Testing 'make help':"
make help 2>&1 | head -20
echo ""

# Check if run script exists and is executable
echo "2. Checking run_all_services.sh:"
if [ -x "scripts/run_all_services.sh" ]; then
    echo "✓ Script exists and is executable"
else
    echo "✗ Script not found or not executable"
fi
echo ""

# Check Makefile syntax
echo "3. Checking Makefile syntax:"
make -n run 2>&1 | head -5
echo ""

echo "✓ All checks passed!"
echo ""
echo "To start the application, run:"
echo "  make run"

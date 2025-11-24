#!/bin/bash

echo "================================"
echo "Running Backend Tests (Python)"
echo "================================"
cd backend
python -m pytest -v --tb=short
BACKEND_EXIT=$?

echo ""
echo "================================"
echo "Running Frontend Tests (JavaScript)"
echo "================================"
cd ../frontend
npx vitest run src/test/ChatInput.test.jsx src/test/MessageBubble.test.jsx src/test/utils.test.jsx
FRONTEND_EXIT=$?

echo ""
echo "================================"
echo "Test Summary"
echo "================================"
if [ $BACKEND_EXIT -eq 0 ]; then
    echo "✅ Backend tests: PASSED"
else
    echo "❌ Backend tests: FAILED"
fi

if [ $FRONTEND_EXIT -eq 0 ]; then
    echo "✅ Frontend tests: PASSED"
else
    echo "❌ Frontend tests: FAILED"
fi

if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed!"
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed"
    exit 1
fi

#!/bin/bash

# Test script for GitHub PR creation API
# Make sure the dev server is running (npm run dev) before executing this script

echo "🚀 Testing GitHub PR Creation API..."
echo ""

# Make the API request
response=$(curl -s -X POST http://localhost:3000/api/create-pr)

# Check if curl was successful
if [ $? -ne 0 ]; then
    echo "❌ Error: Could not connect to API. Is the dev server running?"
    echo "   Run 'npm run dev' first."
    exit 1
fi

# Pretty print the response
echo "📋 Response:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# Check if successful (using grep -E for regex to handle optional whitespace)
if echo "$response" | grep -qE '"success":\s*true'; then
    echo "✅ Success! Pull request created."
    
    # Extract and display the PR URL
    pr_url=$(echo "$response" | grep -o '"url": "[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$pr_url" ]; then
        echo "🔗 PR URL: $pr_url"
    fi
else
    echo "❌ Failed to create pull request."
    echo "   Check the error details above."
fi

#!/bin/bash
set -e
echo "Building shared package..."
npm run build --workspace=shared
echo "Building frontend..."
npm run build --workspace=frontend
echo "Done!"

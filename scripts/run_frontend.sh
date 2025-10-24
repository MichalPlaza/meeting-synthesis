#!/bin/bash

# Exit on error
set -e

# Navigate to the frontend directory
cd frontend

# Install dependencies
pnpm install

# Run the frontend dev server
pnpm run dev

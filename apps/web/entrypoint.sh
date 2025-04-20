#!/bin/sh

# Navigate to root directory to install all workspace dependencies
cd /app

# Install dependencies
pnpm install

# Return to web app directory
cd /app/apps/web

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev --name init --skip-seed --skip-generate

# Start the app
pnpm run dev
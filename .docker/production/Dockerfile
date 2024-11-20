# Default images
ARG BASE_IMAGE="node:22-alpine"

# Base stage
FROM $BASE_IMAGE AS base

# Install curl, bash and sh (used to check if Verdaccio is running)
RUN apk add --no-cache curl bash

# If you are registered, you will remain at the root of the work environment.
WORKDIR /workspaces/app

# Copy package.json and package-lock.json files
COPY package*.json ./ 

# Check if Verdaccio is running, otherwise use npmjs registry
RUN if curl -s http://localhost:4873/ > /dev/null; then \
  echo "Verdaccio is running, using Verdaccio registry"; \
  npm set registry http://localhost:4873/; \
  else \
  echo "Verdaccio is not running, using npmjs registry"; \
  npm set registry https://registry.npmjs.org/; \
  fi

# Install dependencies using npm ci (more reliable and faster)
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Create a non-root user for security reasons and use it
RUN if [ -f /etc/alpine-release ]; then \
  adduser -D app_user; \
  elif [ -f /etc/debian_version ]; then \
  adduser --disabled-password --gecos "" app_user; \
  else \
  useradd -m -s /bin/bash app_user; \
  fi

# Ensure app_user has ownership over the application files
RUN chown -R app_user:app_user /workspaces/app

# Create the logs directory and ensure the app_user has the correct permissions
RUN mkdir -p /workspaces/app/logs && chmod 777 /workspaces/app/logs

USER app_user

# Expose the application port
EXPOSE 3000

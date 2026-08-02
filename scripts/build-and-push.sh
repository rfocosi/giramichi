#!/usr/bin/env bash
set -e

# Load environment variables from unversioned .env / .env.local files if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Retrieve Registry Server from environment variable
REGISTRY="${REGISTRY_SERVER:-${DOCKER_REGISTRY:-}}"

if [ -z "$REGISTRY" ]; then
  echo "❌ Error: Registry server is not set."
  echo "Please set the REGISTRY_SERVER environment variable or specify it in your unversioned .env file."
  echo "Example usage:"
  echo "  export REGISTRY_SERVER=192.168.50.10:30500"
  echo "  ./scripts/build-and-push.sh"
  exit 1
fi

# Sanitize registry host by removing http:// or https:// scheme and trailing slashes
REGISTRY_HOST=$(echo "$REGISTRY" | sed -E 's#^https?://##' | sed -E 's#/*$##')
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "=================================================="
echo "🚀 Giramichi Docker Build & Push Automation"
echo "Target Registry: ${REGISTRY_HOST}"
echo "Tag:             ${IMAGE_TAG}"
echo "=================================================="

# Array of image names and their corresponding Dockerfiles
SERVICES=(
  "giramichi-server:Dockerfile.server"
  "giramichi-frontend:Dockerfile.frontend"
  "giramichi-mcp:Dockerfile.mcp"
  "giramichi-mcp-stdio:Dockerfile.mcp-stdio"
)

for service in "${SERVICES[@]}"; do
  IMAGE_NAME="${service%%:*}"
  DOCKERFILE="${service#*:}"
  FULL_TAG="${REGISTRY_HOST}/${IMAGE_NAME}:${IMAGE_TAG}"

  echo ""
  echo "📦 Building image [${IMAGE_NAME}] (${DOCKERFILE})..."
  docker build -t "${FULL_TAG}" -f "${DOCKERFILE}" .

  echo "📤 Pushing image [${FULL_TAG}] to registry..."
  docker push "${FULL_TAG}"

  echo "✅ Successfully built and pushed ${FULL_TAG}"
done

echo ""
echo "=================================================="
echo "🎉 All Giramichi container images successfully built and pushed!"
echo "=================================================="

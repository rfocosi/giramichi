#!/bin/sh
IS_DEMO_VAL="false"
if [ "$VITE_DEMO" = "true" ] || [ "$DEMO" = "true" ] || [ "$IS_DEMO" = "true" ]; then
  IS_DEMO_VAL="true"
fi

cat <<EOF > /usr/share/nginx/html/config.js
window.__CONFIG__ = { apiUrl: "${GIRAMICHI_API_URL:-}", isDemo: ${IS_DEMO_VAL}, version: "${GIRAMICHI_VERSION:-}" };
EOF

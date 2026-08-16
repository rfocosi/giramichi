#!/bin/sh
cat <<EOF > /usr/share/nginx/html/config.js
window.__CONFIG__ = { apiUrl: "${GIRAMICHI_API_URL:-}", version: "${GIRAMICHI_VERSION:-}" };
EOF


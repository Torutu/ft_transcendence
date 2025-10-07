FROM alpine:3.20

WORKDIR /app

# Install curl and certificates for HTTPS downloads
RUN apk add --no-cache curl ca-certificates && update-ca-certificates

# Download and install ngrok v3 (amd64 build)
RUN curl -L https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    | tar -xz -C /usr/local/bin

# Create entrypoint script
RUN printf '#!/bin/sh\n' > /entrypoint.sh \
    && printf 'if [ -z "$NGROK_AUTHTOKEN" ]; then\n' >> /entrypoint.sh \
    && printf '  echo "ERROR: NGROK_AUTHTOKEN is not set"\n' >> /entrypoint.sh \
    && printf '  exit 1\n' >> /entrypoint.sh \
    && printf 'fi\n\n' >> /entrypoint.sh \
    && printf '# Detect mode: default to dev\n' >> /entrypoint.sh \
    && printf 'MODE=${APP_MODE:-dev}\n' >> /entrypoint.sh \
    && printf 'if [ "$MODE" = "prod" ]; then\n' >> /entrypoint.sh \
    && printf '  NGROK_PORT=${NGINX_PORT}\n' >> /entrypoint.sh \
    && printf '  NGROK_HOST=${NGINX_HOST}\n' >> /entrypoint.sh \
    && printf 'else\n' >> /entrypoint.sh \
    && printf '  NGROK_PORT=${VITE_PORT}\n' >> /entrypoint.sh \
    && printf '  NGROK_HOST=${VITE_HOST}\n' >> /entrypoint.sh \
    && printf 'fi\n\n' >> /entrypoint.sh \
    && printf '# Generate config\n' >> /entrypoint.sh \
    && printf 'cat > /tmp/ngrok.yml << EOF\n' >> /entrypoint.sh \
    && printf 'version: "2"\n' >> /entrypoint.sh \
    && printf 'authtoken: ${NGROK_AUTHTOKEN}\n' >> /entrypoint.sh \
    && printf 'web_addr: 0.0.0.0:4040\n' >> /entrypoint.sh \
    && printf 'tunnels:\n' >> /entrypoint.sh \
    && printf '  app:\n' >> /entrypoint.sh \
    && printf '    addr: ${NGROK_HOST}:${NGROK_PORT}\n' >> /entrypoint.sh \
    && printf '    proto: http\n' >> /entrypoint.sh \
    && printf '    schemes: [ https ]\n' >> /entrypoint.sh \
    && printf 'EOF\n\n' >> /entrypoint.sh \
    && printf 'echo "Starting ngrok tunnel to ${NGROK_HOST}:${NGROK_PORT} (mode: $MODE)..."\n' >> /entrypoint.sh \
    && printf 'exec ngrok http ${NGROK_HOST}:${NGROK_PORT} --config /tmp/ngrok.yml --log=stdout --url=https://default.internal\n' >> /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
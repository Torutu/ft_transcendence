FROM alpine:3.20

WORKDIR /app

# Install curl and certificates for HTTPS downloads
RUN apk add --no-cache curl ca-certificates && update-ca-certificates

# Download and install ngrok v3 (amd64 build)
RUN curl -L https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    | tar -xz -C /usr/local/bin

# Create entrypoint that sets authtoken, creates config, and runs ngrok
RUN printf '#!/bin/sh\n' > /entrypoint.sh \
    && printf 'if [ -z "$NGROK_AUTHTOKEN" ]; then\n' >> /entrypoint.sh \
    && printf '  echo "ERROR: NGROK_AUTHTOKEN is not set"\n' >> /entrypoint.sh \
    && printf '  exit 1\n' >> /entrypoint.sh \
    && printf 'fi\n\n' >> /entrypoint.sh \
    && printf '# Default VITE port if not set\n' >> /entrypoint.sh \
    && printf 'NGROK_PORT=${VITE_PORT:-5173}\n\n' >> /entrypoint.sh \
    && printf 'NGROK_HOST=${VITE_HOST:-frontend}\n\n' >> /entrypoint.sh \
    && printf '# Create config file\n' >> /entrypoint.sh \
    && printf 'cat > /tmp/ngrok.yml << EOF\n' >> /entrypoint.sh \
    && printf 'version: "2"\n' >> /entrypoint.sh \
    && printf 'authtoken: ${NGROK_AUTHTOKEN}\n' >> /entrypoint.sh \
    && printf 'web_addr: 0.0.0.0:4040\n' >> /entrypoint.sh \
    && printf 'log_level: info\n' >> /entrypoint.sh \
    && printf 'log_format: logfmt\n' >> /entrypoint.sh \
    && printf 'tunnels:\n' >> /entrypoint.sh \
    && printf '  vite:\n' >> /entrypoint.sh \
    && printf '    addr: ${NGROK_HOST}:${NGROK_PORT}\n' >> /entrypoint.sh \
    && printf '    proto: http\n' >> /entrypoint.sh \
    && printf '    schemes: [ https ]\n' >> /entrypoint.sh \
    && printf 'EOF\n\n' >> /entrypoint.sh \
    && printf 'echo "Starting ngrok tunnel on ${NGROK_HOST}:${NGROK_PORT}..."\n' >> /entrypoint.sh \
    && printf 'exec ngrok http ${NGROK_HOST}:${NGROK_PORT} --config /tmp/ngrok.yml --log=stdout --url=https://default.internal\n' >> /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
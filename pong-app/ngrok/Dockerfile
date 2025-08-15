FROM alpine:3.20
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
    && printf 'fi\n' >> /entrypoint.sh \
    && printf '\n' >> /entrypoint.sh \
    && printf '# Create config file with web interface bound to all interfaces\n' >> /entrypoint.sh \
    && printf 'cat > /tmp/ngrok.yml << EOF\n' >> /entrypoint.sh \
    && printf 'version: "2"\n' >> /entrypoint.sh \
    && printf 'authtoken: ${NGROK_AUTHTOKEN}\n' >> /entrypoint.sh \
    && printf 'web_addr: 0.0.0.0:4040\n' >> /entrypoint.sh \
    && printf 'log_level: info\n' >> /entrypoint.sh \
    && printf 'log_format: logfmt\n' >> /entrypoint.sh \
    && printf 'EOF\n' >> /entrypoint.sh \
    && printf '\n' >> /entrypoint.sh \
    && printf 'exec ngrok --config /tmp/ngrok.yml "$@"\n' >> /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
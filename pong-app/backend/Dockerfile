FROM node:20.11.1

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy everything else (source code)
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# RUN mkdir -p /app/certs && apt install -y openssl
# RUN openssl req -x509 -nodes -out /app/certs/cert.pem \
# 	-keyout /app/certs/key.pem \
# 	-subj "/C=FI/L=Helsinki/O=42/OU=42/CN=nvallin.42.fr/UID=nvallin"

# Expose the app port
EXPOSE 3000

# Run migrations and start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
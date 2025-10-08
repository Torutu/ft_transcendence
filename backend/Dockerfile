FROM node:22

WORKDIR /app

# Copy package files and install dependencies
COPY . .
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm install

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Verify index.js exists in the dist directory
RUN ls -a dist/

# Expose the app port
EXPOSE 3000

# Run migrations and start the app
CMD ["sh", "-xc", "pwd && ls && npx prisma migrate deploy && npx tsx src/index.ts"]
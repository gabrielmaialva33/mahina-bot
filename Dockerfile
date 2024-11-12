# Stage 1: Build TypeScript
FROM node:23 AS builder

WORKDIR /opt/mahina-bot/

# Copy only package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and configuration
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma db push && \
    npm run build

# Stage 2: Create production image
FROM node:23-slim

ENV NODE_ENV=production

WORKDIR /opt/mahina-bot/

# Install necessary tools
RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled code and necessary files from the builder stage
COPY --from=builder /opt/mahina-bot/dist ./dist
COPY --from=builder /opt/mahina-bot/src/utils/mahina_logo.txt ./src/utils/mahina_logo.txt
COPY --from=builder /opt/mahina-bot/prisma ./prisma
COPY --from=builder /opt/mahina-bot/scripts ./scripts
COPY --from=builder /opt/mahina-bot/locales ./locales

# Install production dependencies
COPY --from=builder /opt/mahina-bot/package*.json ./
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate
RUN npx prisma db push

# Ensure application.yml is a file, not a directory
RUN rm -rf /opt/mahina-bot/application.yml && \
    touch /opt/mahina-bot/application.yml

# Run as non-root user
RUN addgroup --gid 322 --system mahina-bot && \
    adduser --uid 322 --system mahina-bot && \
    chown -R mahina-bot:mahina-bot /opt/mahina-bot/

USER mahina-bot

CMD ["node", "dist/index.js"]

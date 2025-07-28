# Stage 1: Build TypeScript
FROM node:23 AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /opt/mahina-bot/

# Copy lockfile if it exists
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy source code and configuration
COPY . .

# Generate Prisma client and build TypeScript
RUN pnpm prisma generate && \
    pnpm run build

# Stage 2: Create production image
FROM node:23-slim

ENV NODE_ENV=production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /opt/mahina-bot/

# Install necessary tools and build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled code and necessary files from the builder stage
COPY --from=builder /opt/mahina-bot/dist ./dist
COPY --from=builder /opt/mahina-bot/src/utils/mahina_logo.txt ./src/utils/mahina_logo.txt
COPY --from=builder /opt/mahina-bot/prisma ./prisma
COPY --from=builder /opt/mahina-bot/scripts ./scripts
COPY --from=builder /opt/mahina-bot/locales ./locales

# Copy package files, lockfile, and node_modules from builder
COPY --from=builder /opt/mahina-bot/package.json ./
COPY --from=builder /opt/mahina-bot/pnpm-lock.yaml* ./
COPY --from=builder /opt/mahina-bot/node_modules ./node_modules

# Prune dev dependencies (faster than reinstalling)
RUN pnpm prune --prod

# Copy the generated Prisma client from node_modules (already generated in builder)
# No need to regenerate since we copied node_modules with the client already generated

# Ensure application.yml is a file, not a directory
RUN rm -rf /opt/mahina-bot/application.yml && \
    touch /opt/mahina-bot/application.yml

# Run as non-root user
RUN addgroup --gid 322 --system mahina-bot && \
    adduser --uid 322 --system mahina-bot && \
    chown -R mahina-bot:mahina-bot /opt/mahina-bot/

USER mahina-bot

CMD ["node", "dist/index.js"]

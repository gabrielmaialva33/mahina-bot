FROM node:lts AS base

# Create app directory and set ownership
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

# Set the working directory
WORKDIR /home/node/app

# Install dumb-init and other dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Dependencies stage
FROM base AS dependencies
USER node

# Copy package.json and install dependencies
COPY --chown=node:node package*.json ./
RUN pnpm install

# Build stage
FROM dependencies AS build

# Copy all files and remove .git
COPY --chown=node:node . .
RUN rm -rf .git

# Generate Prisma files and build the app
RUN npx prisma generate \
    && pnpm build

# Release stage
FROM base AS release

# Copy necessary files from previous stages
COPY --from=dependencies /home/node/app/node_modules ./node_modules
COPY --from=build /home/node/app/build ./build
COPY --from=build /home/node/app/package.json ./package.json
COPY --from=build /home/node/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /home/node/app/prisma ./prisma
COPY --from=build /home/node/app/.env ./.env
COPY --from=build /home/node/app/movies ./movies

USER node

# Final Prisma setup and start the application
RUN npx prisma generate

CMD ["dumb-init", "node", "build/main.js"]

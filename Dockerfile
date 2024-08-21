FROM node:lts AS base

# Create app directory
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Set the working directory
WORKDIR /home/node/app

# Install dumb-init
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init

FROM base AS dependencies
COPY package*.json ./
COPY --chown=node:node ./package*.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY --chown=node:node . .
RUN rm -rf .git;

FROM dependencies AS build

# Prisma
RUN npx prisma generate
RUN npx npx prisma db push

COPY --chown=node:node . .

# Build the app
RUN pnpm build

FROM base AS release

# Install ffmpeg
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg

COPY --from=dependencies /home/node/app/node_modules ./node_modules
COPY --from=build /home/node/app/build ./build
COPY --from=build /home/node/app/package.json ./package.json
COPY --from=build /home/node/app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /home/node/app/prisma ./prisma

# Prisma
RUN npx prisma generate
RUN npx npx prisma db push

USER node

CMD ["dumb-init", "node", "build/main.js"]



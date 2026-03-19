ARG NODE_VERSION=25
ARG PNPM_VERSION=10.32.1

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 python-is-python3 make g++ \
    pkg-config libvips-dev \
    && rm -rf /var/lib/apt/lists/*

RUN npm config set update-notifier false && npm install -g pnpm@${PNPM_VERSION}

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# VPS CPU lacks x86-64-v2: prebuilt sharp binaries crash, WASM SIMD also unsupported.
# Build sharp from source against system libvips (compiled for generic x86-64).
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN cd node_modules/.pnpm/sharp@*/node_modules/sharp && npm run build

FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build && pnpm prune --prod

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /opt/mahina-bot/package.json ./package.json
COPY --from=build /opt/mahina-bot/node_modules ./node_modules
COPY --from=build /opt/mahina-bot/dist ./dist
COPY --from=build /opt/mahina-bot/prisma ./prisma
COPY --from=build /opt/mahina-bot/locales ./locales
COPY --from=build /opt/mahina-bot/src/utils/mahina_logo.txt ./src/utils/mahina_logo.txt

RUN addgroup --system --gid 322 mahina-bot \
    && adduser --system --uid 322 --ingroup mahina-bot mahina-bot \
    && chown -R mahina-bot:mahina-bot /opt/mahina-bot

USER mahina-bot

CMD ["node", "dist/index.js"]

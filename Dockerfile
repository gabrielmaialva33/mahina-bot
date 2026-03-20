ARG NODE_VERSION=25
ARG PNPM_VERSION=10.32.1

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 python-is-python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm config set update-notifier false && npm install -g pnpm@${PNPM_VERSION}

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build && pnpm prune --prod

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 python-is-python3 ffmpeg curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
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

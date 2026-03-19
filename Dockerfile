ARG NODE_VERSION=25
ARG PNPM_VERSION=10.32.1

# ── Stage 1: Build libvips 8.18 from source (generic x86-64, no v2 required) ──
FROM node:${NODE_VERSION}-slim AS libvips-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ninja-build pkg-config wget ca-certificates \
    python3 python3-pip python-is-python3 \
    libglib2.0-dev libexpat1-dev libjpeg62-turbo-dev libpng-dev \
    libwebp-dev libexif-dev libtiff-dev libheif-dev libcgif-dev \
    && pip3 install meson --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

ARG VIPS_VERSION=8.18.0
RUN wget -q https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz \
    && tar xf vips-${VIPS_VERSION}.tar.xz \
    && cd vips-${VIPS_VERSION} \
    && meson setup build --prefix=/usr/local --libdir=lib --buildtype=release \
       -Dintrospection=disabled -Dmodules=disabled \
    && cd build && meson compile && meson install \
    && ldconfig

# ── Stage 2: Base with Node + pnpm ──
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 python-is-python3 make g++ pkg-config \
    libglib2.0-dev libexpat1-dev libjpeg62-turbo-dev libpng-dev \
    libwebp-dev libexif-dev libtiff-dev libheif-dev libcgif-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy libvips 8.18 built from source
COPY --from=libvips-builder /usr/local/lib/ /usr/local/lib/
COPY --from=libvips-builder /usr/local/include/ /usr/local/include/
COPY --from=libvips-builder /usr/local/lib/pkgconfig/ /usr/local/lib/pkgconfig/
RUN ldconfig

RUN npm config set update-notifier false && npm install -g pnpm@${PNPM_VERSION}

# ── Stage 3: Install deps + build sharp from source against libvips 8.18 ──
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build sharp native addon from source using system libvips 8.18
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN cd node_modules/.pnpm/sharp@*/node_modules/sharp && npm run build

# ── Stage 4: Build app ──
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build && pnpm prune --prod

# ── Stage 5: Runtime (slim) ──
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/mahina-bot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
    libglib2.0-0t64 libexpat1 libjpeg62-turbo libpng16-16t64 \
    libwebp7t64 libexif12 libtiff6 libheif1 libcgif0 \
    && rm -rf /var/lib/apt/lists/*

# Copy libvips 8.18 shared libs for runtime
COPY --from=libvips-builder /usr/local/lib/libvips*.so* /usr/local/lib/
RUN ldconfig

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

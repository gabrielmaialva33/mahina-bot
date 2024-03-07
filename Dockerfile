FROM node:lts-alpine as base
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
RUN apk --no-cache add dumb-init

FROM base as dependencies
COPY package*.json ./
COPY --chown=node:node ./package*.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY --chown=node:node . .
RUN rm -rf .git;

FROM dependencies as build
RUN pnpm build

FROM base as release
COPY --from=dependencies /home/node/app/node_modules ./node_modules
COPY --from=build /home/node/app/build ./build
COPY --from=build /home/node/app/package.json ./package.json
COPY --from=build /home/node/app/pnpm-lock.yaml ./pnpm-lock.yaml

USER node
CMD ["dumb-init", "node", "build/main.js"]



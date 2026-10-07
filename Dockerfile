# syntax = docker/dockerfile:1

ARG NODE_VERSION=22-slim
FROM node:${NODE_VERSION} as base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

# Install dependencies needed for node-gyp or build
FROM base as build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package-lock.json package.json ./
RUN npm ci --include=dev

COPY . .

RUN npm run build
RUN npm prune --omit=dev

# Final production stage
FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/server /app/server
COPY --from=build /app/package.json /app/package.json

EXPOSE 8080

CMD [ "npm", "run", "start" ]

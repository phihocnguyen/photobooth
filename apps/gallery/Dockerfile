# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    GALLERY_ROLE=api \
    GALLERY_MEDIA_DIR=/data/media

COPY --from=build --chown=node:node /app/package.json /app/next.config.mjs ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
RUN install -d -m 0750 -o node -g node /data/media

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]

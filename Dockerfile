# Hosting image (Render): the API, the prebuilt web app and the team panel (/admin) on one address.
# The web app is built locally into deploy/web (Flutter is not needed on the host):
#   node scripts/deploy-web.mjs
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig*.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

# Team panel, served by the API at /admin.
FROM node:24-bookworm-slim AS admin
WORKDIR /admin
COPY admin/package*.json ./
RUN npm ci
COPY admin/index.html admin/tsconfig.json admin/vite.config.ts ./
COPY admin/public ./public
COPY admin/src ./src
RUN npx vite build --base=/admin/

FROM node:24-bookworm-slim
ENV NODE_ENV=production WEB_DIR=/app/web ADMIN_DIR=/app/admin
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package.json ./
COPY backend/drizzle ./drizzle
COPY deploy/web ./web
COPY --from=admin /admin/dist ./admin
RUN mkdir -p /app/storage /app/models && chown node:node /app/storage /app/models
USER node
EXPOSE 10000
CMD ["node", "dist/main.js"]

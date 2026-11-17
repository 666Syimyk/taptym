FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY drizzle ./drizzle
# models/ holds the on-device recognition model, fetched once on first start.
RUN mkdir -p /app/storage /app/models && chown node:node /app/storage /app/models
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

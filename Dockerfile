FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY prisma/schema.cloud.prisma prisma/schema.cloud.prisma
RUN npx prisma generate --schema prisma/schema.cloud.prisma
COPY server/tsconfig.json server/tsconfig.json
COPY server/src server/src
RUN npm run build:server && npm prune --omit=dev --ignore-scripts

FROM node:22-slim
ENV NODE_ENV=production PORT=8787
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY package.json ./package.json
EXPOSE 8787
CMD ["node", "dist-server/app.js"]

FROM node:22-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=6144
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p .fan-life && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]

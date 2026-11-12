# A Dubel Team static site on Google Cloud Run (deploy/static/server.mjs + site.json + site/).
FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=1000:1000 bundle/ /app/
ENV NODE_ENV=production PORT=8080
USER 1000
EXPOSE 8080
CMD ["node", "/app/server.mjs"]

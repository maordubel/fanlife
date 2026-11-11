# FAN LIFE on Google Cloud Run. The workflow builds the site (Next standalone) into ./bundle; this only runs it.
FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=1000:1000 bundle/ /app/
ENV NODE_ENV=production VERCEL_ENV=production NODE_OPTIONS=--max-old-space-size=1536 PORT=8080
USER 1000
EXPOSE 8080
CMD ["sh", "/app/deploy-start.sh"]

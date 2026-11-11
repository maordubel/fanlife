# The Space builds nothing: the GitHub workflow builds FAN LIFE and publishes it as a release asset; this pulls it.
FROM node:22-bookworm-slim
ARG BUNDLE_URL
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app && curl -fsSL "$BUNDLE_URL" | tar -xz -C /app && chown -R 1000:1000 /app
WORKDIR /app
ENV NODE_ENV=production VERCEL_ENV=production NODE_OPTIONS=--max-old-space-size=12288
USER 1000
EXPOSE 7860
CMD ["sh", "/app/deploy-start.sh"]

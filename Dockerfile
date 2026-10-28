# Apply worker image (browser agent). The web app deploys separately (e.g. Vercel).
# Build:  docker build -t opurnos-worker .
# Run:    docker run -p 8787:8787 -e DATABASE_URL=... -e APPLY_WORKER_SECRET=... -e MODEL_API_KEY=... opurnos-worker
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app
ENV NODE_ENV=production \
    BROWSER_EXECUTABLE=/ms-playwright/chromium \
    BROWSER_HEADLESS=true \
    PORT=8787

COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts

COPY tsconfig.json ./
COPY drizzle ./drizzle
COPY src/lib ./src/lib
COPY worker ./worker

# Resolve the bundled Chromium binary path (the version folder name changes between releases).
RUN ln -sf "$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome | head -1)" /ms-playwright/chromium

USER pwuser
EXPOSE 8787
CMD ["npx", "tsx", "worker/server.ts"]

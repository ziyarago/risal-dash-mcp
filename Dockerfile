# Minimal image so registries (e.g. Glama) can start the server and run introspection.
# With no reachable RISAL_ESP_URL it boots in demo mode and still advertises its tools.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.mjs lib.mjs README.md LICENSE ./
ENTRYPOINT ["node", "index.mjs"]

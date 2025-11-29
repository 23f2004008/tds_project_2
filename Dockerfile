# Playwright base image with Chromium + deps
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Install deps first for cache
COPY package*.json ./
RUN npm install --omit=dev

# Copy rest of project
COPY . .

# Expose a default port (Koyeb will override)
EXPOSE 3000

# Start server
CMD ["node", "index.js"]

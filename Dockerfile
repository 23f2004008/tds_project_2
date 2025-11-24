# Playwright base image with all deps
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Copy ONLY package.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the project
COPY . .

# Expose port 3000 for Railway
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]

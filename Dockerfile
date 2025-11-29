# Use official Node.js environment
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your app
COPY . .

# HuggingFace expects the server to run on PORT env variable
ENV PORT=7860

# Expose port
EXPOSE 7860

# Start your Node server
CMD ["node", "index.js"]

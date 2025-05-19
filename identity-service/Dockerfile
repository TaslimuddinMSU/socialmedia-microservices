# Use the official Node.js image
FROM node:latest

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 8001

# Start the app
CMD ["node", "src/server.js"]

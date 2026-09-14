ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose API port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

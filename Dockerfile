FROM node:20-alpine

WORKDIR /app

# Copy only package.json (no lockfile in monorepo API)
COPY vibecode/apps/api/package.json ./

# Install dependencies fresh
RUN npm install --legacy-peer-deps

# Copy API source code
COPY vibecode/apps/api/src ./src
COPY vibecode/apps/api/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]

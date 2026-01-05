FROM node:20-alpine

WORKDIR /app

# Copy API package files from monorepo structure
COPY vibecode/apps/api/package.json vibecode/apps/api/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy API source code
COPY vibecode/apps/api/ .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]

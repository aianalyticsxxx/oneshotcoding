FROM node:20-alpine

WORKDIR /app

# Copy only package.json (no lockfile in monorepo API)
COPY vibecode/apps/api/package.json ./

# Install dependencies fresh
RUN npm install --legacy-peer-deps

# Copy API source code
COPY vibecode/apps/api/src ./src

# Create standalone tsconfig for Docker build
RUN echo '{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","outDir":"./dist","rootDir":"./src","strict":true,"esModuleInterop":true,"skipLibCheck":true,"resolveJsonModule":true},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.json

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]

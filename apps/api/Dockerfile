FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install and build
RUN npm install
RUN npm run build --workspace=@leadforge/api

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]

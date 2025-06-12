# docker build -t ecomnest:v.0.0.3 .
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS prod-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/package-lock.json /app/package-lock.json


WORKDIR /app

RUN npm install --production

EXPOSE 3000

CMD ["node", "/app/main.js"]
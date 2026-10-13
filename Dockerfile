FROM node:23-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3001

CMD ["npm", "start"]

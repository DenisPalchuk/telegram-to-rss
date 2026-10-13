FROM node:23-alpine

WORKDIR /app

COPY package.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm install --omit=dev --no-audit --no-fund \
    && apk del .build-deps

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3001

CMD ["npm", "start"]

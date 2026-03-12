FROM node:24

WORKDIR /app

COPY . .

RUN npm ci

CMD ["npm", "start"]

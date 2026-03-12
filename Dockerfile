FROM node:24

COPY . .

RUN npm ci

CMD ["npm", "start"]

FROM node:24

COPY . .

RUN npm ci

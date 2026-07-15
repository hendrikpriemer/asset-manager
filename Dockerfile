# Development image with hot reload. A production multi-stage build
# (deps -> build -> standalone runtime) can be added once hosting is decided.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

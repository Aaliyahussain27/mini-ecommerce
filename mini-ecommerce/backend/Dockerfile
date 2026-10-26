FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node server.js ./

ENV NODE_ENV=production
EXPOSE 5000

USER node
CMD ["npm", "start"]

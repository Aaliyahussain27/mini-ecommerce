FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS production

ENV BACKEND_URL=http://backend:5000
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

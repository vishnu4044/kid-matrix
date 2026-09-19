FROM node:20-slim AS build
WORKDIR /app
# Vite bakes VITE_* vars into the static bundle at build time, not runtime —
# so the backend's URL has to be supplied as a build arg here, not a normal
# container env var. On Railway: Service Settings -> Variables, add
# VITE_API_BASE_URL, then reference it as a build arg in Settings -> Build.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

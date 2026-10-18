# Serve the AES Education Platform (static site)
FROM nginx:alpine
COPY web/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

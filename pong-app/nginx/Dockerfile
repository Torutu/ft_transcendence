FROM nginx:stable

WORKDIR /usr/src/app

RUN mkdir -p /etc/nginx/ssl && apt install -y openssl
RUN openssl req -x509 -nodes -out /etc/nginx/ssl/cert.pem \
	-keyout /etc/nginx/ssl/key.pem \
	-subj "/C=FI/L=Helsinki/O=42/OU=42/CN=nvallin.42.fr/UID=nvallin"
RUN mkdir -p /var/run/nginx

COPY ./nginx.conf /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]


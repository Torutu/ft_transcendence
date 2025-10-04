FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

COPY tls/key.pem /tls/key.pem
COPY tls/cert.pem /tls/key.pem

RUN npm run build

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
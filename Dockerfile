FROM node:20-bookworm

RUN apt-get update \
    && apt-get install -y python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip3 install --break-system-packages -r python/requirements.txt

RUN npm install --prefix backend

ENV NODE_ENV=production
ENV PYTHON_BIN=python3

EXPOSE 5001

CMD ["npm", "start", "--prefix", "backend"]
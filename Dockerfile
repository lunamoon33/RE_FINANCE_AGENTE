FROM node:22-slim

RUN npm install -g openclaw@latest

WORKDIR /app
COPY . .

RUN mkdir -p /root/.openclaw
COPY openclaw.json /root/.openclaw/openclaw.json

CMD ["openclaw", "gateway", "--no-daemon"]

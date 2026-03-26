FROM ghcr.io/openclaw/openclaw:latest
USER root
COPY . /home/node/.openclaw
RUN chown -R node:node /home/node/.openclaw
USER node
CMD ["openclaw", "gateway"]

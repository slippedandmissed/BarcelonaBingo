FROM oven/bun:1-alpine

RUN apk add --no-cache \
  ffmpeg

WORKDIR /app/backend

COPY backend/src /app/backend/src
COPY backend/node_modules /app/backend/node_modules
COPY backend/package.json /app/backend/package.json
COPY backend/assets /app/backend/assets
COPY node_modules /app/node_modules

RUN chown -R bun:bun /app

USER bun

ENTRYPOINT [ "/usr/local/bin/bun" ]
CMD [ "start" ]

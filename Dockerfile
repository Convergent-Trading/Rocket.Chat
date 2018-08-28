FROM rocketchat/base:8

ADD /build /app

MAINTAINER buildmaster@rocket.chat

RUN set -x \
 && cd /app/bundle/programs/server \
 && npm install \
 && chown -R rocketchat:rocketchat /app

USER rocketchat

VOLUME /app/uploads

WORKDIR /app/bundle

CMD ["node", "main.js"]

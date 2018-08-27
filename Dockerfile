FROM node:8.11.3

ADD . /app/bundle
RUN curl https://install.meteor.com/ | sh

WORKDIR /app/bundle

ENV PORT=3000 \
    ROOT_URL=http://localhost:3000

EXPOSE 3000

CMD meteor npm start
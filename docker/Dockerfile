FROM debian:buster-slim

RUN apt-get update && apt-get install -y curl software-properties-common

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -

RUN apt-get update && apt-get install -y nodejs git

RUN git clone https://github.com/humlab-sead/sead_viewstate_server

WORKDIR /sead_viewstate_server

CMD ["/usr/bin/nodejs", "src/index.js"]
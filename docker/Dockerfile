FROM debian:buster-slim

RUN apt-get update && apt-get install -y curl software-properties-common

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -

RUN apt-get update && apt-get install -y nodejs git

RUN git clone https://github.com/humlab-sead/sqs_viewstate_server

WORKDIR /sqs_viewstate_server

CMD ["/usr/bin/nodejs", "src/index.js"]
FROM node:16.14.0
ENV TARBALL=jkl_client-1.0.0.tgz

RUN mkdir /node
WORKDIR /node
COPY $TARBALL .
RUN tar zxvf $TARBALL
RUN mkdir package/src/uploads package/logs
COPY .env package/.env
WORKDIR /node/package
RUN npm i
RUN npm run genesis

EXPOSE 3000

CMD ["npm", "start"]
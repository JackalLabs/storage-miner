FROM golang:1.16.12-buster
ENV TARBALL=jkl_client-1.0.0.tgz

RUN apt-get update && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

RUN wget https://dist.ipfs.io/go-ipfs/v0.11.0/go-ipfs_v0.11.0_linux-amd64.tar.gz
RUN tar -xvzf go-ipfs_v0.11.0_linux-amd64.tar.gz
RUN bash go-ipfs/install.sh

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
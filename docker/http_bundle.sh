find pack ! -path pack -delete
npm pack --pack-destination pack
touch docker/.anchor
cp docker/docker.env.http.template pack/.env
cp docker/node.env.template pack/node.env
cp docker/Dockerfile pack/Dockerfile
cp docker/docker-compose.yaml.http pack/docker-compose.yaml
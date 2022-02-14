find pack ! -path pack -delete
npm pack --pack-destination pack
touch docker/.anchor
cp docker/docker.env.traefik.template pack/.env
cp docker/node.env.template pack/node.env
cp docker/Dockerfile pack/Dockerfile
cp docker/docker-compose.yaml.traefik ../pack/docker-compose.yaml

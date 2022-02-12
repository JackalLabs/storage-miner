find pack ! -path pack -delete
npm pack --pack-destination pack
touch docker/.anchor
cp docker/.env.template pack/.env.template
cp docker/Dockerfile pack/Dockerfile
#cp docker/docker-compose.yaml.traefik ../pack/docker-compose.yaml.traefik
cp docker/docker-compose.yaml.http pack/docker-compose.yaml.http
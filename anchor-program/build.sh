docker stop anchor
docker rm anchor
docker build . --platform linux/x86_64  -t anchor
# Production

```
docker network create network_shared
```

```
docker build -t production-app . -f .docker/production/Dockerfile
```

```
docker run -it --name production-app-container production-app /bin/bash
```

/workspaces/app$
```bash
npm start
```
# Portainer Swarm Stack Deploy

Portainer-stack-deploy is a GitHub Action for deploying a newly updated stack to a Portainer instance. This action is useful when you have a continuous deployment pipeline. The action itself is inspired by how you deploy a task definition to Amazon ECS.


## Action Inputs

| Input              | Description                                                                                                                                                                  | Default      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| portainer-host     | Portainer host, eg. `https://myportainer.instance.com`                                                                                                                       | **Required** |
| portainer-api-key  | Portainer api key                                                                                                                                                            | **Required** |
| swarm-id           | ID of the swarm                                                                                                                                                              | **Required** |
| endpoint-id        | ID of the Portainer node to deploy to                                                                                                                                        | **Required** |
| stack-name         | Name for the Portainer stack                                                                                                                                                 | **Required** |
| stack-definition   | The path to the docker-compose stack stack definition file from repo root, eg. `stack-definition.yml`                                                                        | **Required** |
| template-variables | If given, these variables will be replaced in docker-compose file by handlebars                                                                                              |              |

## Example

The example below shows how the `portainer-stack-deploy` action can be used to deploy a fresh version of your app to Portainer using ghcr.io.

```yaml
name: Deploy

on:
  push:
    branches:
      - master

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    timeout-minutes: 20

    env:
      GITHUB_REF: ${{ github.ref }}
      DOCKER_REGISTRY: ghcr.io
      DOCKER_IMAGE: github-username/my-awesome-web-app

    steps:
      - uses: actions/checkout@v2

      - name: Deploy stack to Portainer
        uses: filaind/portainer-stack-deploy@v1
        with:
          portainer-host: ${{ secrets.PORTAINER_HOST }}
          portainer-api-key: ${{ secrets.PORTAINER_API_KEY }}
          swarm-id: ${{ secrets.PORTAINER_SWARM_ID }}
          endpoint-id: ${{ secrets.PORTAINER_ENDPOINT_ID }}
          stack-name: 'my-awesome-web-app'
          stack-definition: 'stack-definition.yml'
          template-variables: '{"username": "123"}'
```
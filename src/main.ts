import * as core from '@actions/core'
import axios from 'axios'
import { deployStack } from './deployStack'

export async function run(): Promise<void> {
  try {
    const portainerHost: string = core.getInput('portainer-host', {
      required: true
    })
    const apiKey: string = core.getInput('portainer-api-key', {
      required: true
    })
    const endpointId: string = core.getInput('endpoint-id', {
      required: true
    })
    const swarmId: string = core.getInput('swarm-id', {
      required: true
    })
    const stackName: string = core.getInput('stack-name', {
      required: true
    })
    const stackDefinitionFile: string = core.getInput('stack-definition', {
      required: true
    })
    const templateVariables: string = core.getInput('template-variables', {
      required: false
    })

    await deployStack({
      portainerHost,
      endpointId: parseInt(endpointId),
      swarmId: swarmId,
      apiKey: apiKey,
      stackName,
      stackDefinitionFile,
      templateVariables: templateVariables ? JSON.parse(templateVariables) : undefined,
    })
    core.info('✅ Deployment done')
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const {
        status,
        data,
        config: { url, method }
      } = error.response
      return core.setFailed(`AxiosError HTTP Status ${status} (${method} ${url}): ${data}`)
    }
    return core.setFailed(error as Error)
  }
}

run()

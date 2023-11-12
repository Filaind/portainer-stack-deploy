import { PortainerApi } from './api'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import * as core from '@actions/core'

type DeployStack = {
  portainerHost: string
  username: string
  password: string
  swarmId?: string
  endpointId: number
  stackName: string
  stackDefinitionFile: string
  templateVariables?: object
  image?: string
}

enum StackType {
  SWARM = 1,
  COMPOSE = 2
}

function generateNewStackDefinition(
  stackDefinitionFile: string,
  templateVariables?: object,
  image?: string
): string {
  const stackDefFilePath = path.join(process.env.GITHUB_WORKSPACE as string, stackDefinitionFile)
  core.info(`Reading stack definition file from ${stackDefFilePath}`)
  let stackDefinition = fs.readFileSync(stackDefFilePath, 'utf8')
  if (!stackDefinition) {
    throw new Error(`Could not find stack-definition file: ${stackDefFilePath}`)
  }

  if (templateVariables) {
    core.info(`Applying template variables for keys: ${Object.keys(templateVariables)}`)
    stackDefinition = Handlebars.compile(stackDefinition)(templateVariables)
  }

  if (!image) {
    core.info(`No new image provided. Will use image in stack definition.`)
    return stackDefinition
  }

  const imageWithoutTag = image.substring(0, image.indexOf(':'))
  core.info(`Inserting image ${image} into the stack definition`)
  return stackDefinition.replace(new RegExp(`${imageWithoutTag}(:.*)?\n`), `${image}\n`)
}

export async function deployStack({
  portainerHost,
  username,
  password,
  swarmId,
  endpointId,
  stackName,
  stackDefinitionFile,
  templateVariables,
  image
}: DeployStack): Promise<void> {
  const portainerApi = new PortainerApi(portainerHost)

  const stackDefinitionToDeploy = generateNewStackDefinition(
    stackDefinitionFile,
    templateVariables,
    image
  )
  core.debug(stackDefinitionToDeploy)

  core.info('Logging in to Portainer instance...')
  await portainerApi.login({
    username,
    password
  })

  try {
    const allStacks = await portainerApi.getStacks()
    const existingStack = allStacks.find(s => s.Name === stackName)

    if (existingStack) {
      core.info(`Found existing stack with name: ${stackName}`)
      core.info('Updating existing stack...')
      await portainerApi.updateStack(
        existingStack.Id,
        {
          endpointId: existingStack.EndpointId
        },
        {
          env: existingStack.Env,
          stackFileContent: stackDefinitionToDeploy
        }
      )
      core.info('Successfully updated existing stack')
    } else {
      core.info('Deploying new stack...')
      await portainerApi.createStack(
        {
          type: swarmId ? StackType.SWARM : StackType.COMPOSE,
          method: 'string',
          endpointId
        },
        {
          name: stackName,
          stackFileContent: stackDefinitionToDeploy,
          swarmID: swarmId ? swarmId : undefined
        }
      )
      core.info(`Successfully created new stack with name: ${stackName}`)
    }
  } catch (error) {
    core.info('⛔️ Something went wrong during deployment!')
    throw error
  } finally {
    core.info(`Logging out from Portainer instance...`)
    await portainerApi.logout()
  }
}

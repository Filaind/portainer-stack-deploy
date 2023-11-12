import { StacksApi } from './api/index'
import path from 'path'
import fs from 'fs'
import Handlebars from 'handlebars'
import * as core from '@actions/core'
import axios from 'axios'

type DeployStack = {
  portainerHost: string
  apiKey: string
  swarmId: string
  endpointId: number
  stackName: string
  stackDefinitionFile: string
  templateVariables?: object
}


function generateNewStackDefinition(
  stackDefinitionFile: string,
  templateVariables?: object,
): string {
  const stackDefFilePath = stackDefinitionFile; //path.join(process.env.GITHUB_WORKSPACE as string, stackDefinitionFile)
  core.info(`Reading stack definition file from ${stackDefFilePath}`)
  let stackDefinition = fs.readFileSync(stackDefFilePath, 'utf8')
  if (!stackDefinition) {
    throw new Error(`Could not find stack-definition file: ${stackDefFilePath}`)
  }

  if (templateVariables) {
    core.info(`Applying template variables for keys: ${Object.keys(templateVariables)}`)
    stackDefinition = Handlebars.compile(stackDefinition)(templateVariables)
  }

  return stackDefinition
}

export async function deployStack({
  portainerHost,
  apiKey,
  swarmId,
  endpointId,
  stackName,
  stackDefinitionFile,
  templateVariables,
}: DeployStack): Promise<void> {
  const stackApi = new StacksApi({
    apiKey: apiKey,
    basePath: portainerHost,
  })

  const stackDefinitionToDeploy = generateNewStackDefinition(
    stackDefinitionFile,
    templateVariables,
  )
  core.debug(stackDefinitionToDeploy)


  try {
    const allStacks = await stackApi.stackList();
    const existingStack = allStacks.find((s) => s.Name === stackName)

    if (existingStack) {
      core.info(`Found existing stack with name: ${stackName}`)
      core.info('Updating existing stack...')

      await stackApi.stackUpdate(existingStack.Id!, existingStack.EndpointId!, {
        env: existingStack.Env,
        stackFileContent: stackDefinitionToDeploy,
        prune: true,
        pullImage: true,
      })
      core.info('Successfully updated existing stack')
    } else {
      core.info('Deploying new stack...')

      await stackApi.stackCreateDockerSwarmString({
        stackFileContent: stackDefinitionToDeploy,
        name: stackName,
        swarmID: swarmId,
      }, endpointId)
      core.info(`Successfully created new stack with name: ${stackName}`)
    }
  } catch (error: any | Response) {
    if (error.timeout != null) {
      const response = error as Response
      const json = await response.json()
      console.log("🚀 ~ file: deployStack.ts:80 ~ json:", json)
      core.info('⛔️ Something went wrong during deployment!')
      throw json
    }
    throw error
  } finally {
  }
}
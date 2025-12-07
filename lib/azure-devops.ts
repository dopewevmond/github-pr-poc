import axios, { AxiosInstance } from "axios"

/**
 * Azure DevOps configuration from environment variables
 */
const AZURE_DEVOPS_ORG_URL = "https://dev.azure.com/dopewevmond"
const AZURE_DEVOPS_PAT = process.env.AZURE_DEVOPS_PAT!

/**
 * Creates an authenticated axios instance for Azure DevOps API
 * @returns Axios instance with proper authentication headers
 */
export function getAzureDevOpsClient(): AxiosInstance {
  if (!AZURE_DEVOPS_PAT) {
    throw new Error(
      "AZURE_DEVOPS_PAT environment variable is not set. Please add it to your .env.local file."
    )
  }

  const auth = Buffer.from(`:${AZURE_DEVOPS_PAT}`).toString("base64")

  return axios.create({
    baseURL: AZURE_DEVOPS_ORG_URL,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  })
}

/**
 * Azure DevOps API helper functions
 */
export const azureDevOps = {
  /**
   * Get organization URL
   */
  getOrgUrl: () => AZURE_DEVOPS_ORG_URL,

  /**
   * Get project information including ID
   */
  async getProject(projectName: string) {
    const client = getAzureDevOpsClient()
    const response = await client.get(
      `/_apis/projects/${projectName}?api-version=7.1`
    )
    return response.data
  },

  /**
   * Create a service hook subscription (webhook)
   */
  async createWebhook(
    projectId: string,
    repositoryId: string,
    webhookUrl: string,
    eventType: string = "git.pullrequest.created"
  ) {
    const client = getAzureDevOpsClient()
    const webhookUsername = process.env.AZURE_WEBHOOK_USERNAME || "webhook"
    const webhookPassword = process.env.AZURE_WEBHOOK_PASSWORD

    const response = await client.post(
      `/_apis/hooks/subscriptions?api-version=7.1`,
      {
        publisherId: "tfs",
        eventType,
        resourceVersion: "1.0",
        consumerId: "webHooks",
        consumerActionId: "httpRequest",
        publisherInputs: {
          projectId,
          repository: repositoryId,
        },
        consumerInputs: {
          url: webhookUrl,
          ...(webhookPassword && {
            basicAuthUsername: webhookUsername,
            basicAuthPassword: webhookPassword,
          }),
        },
      }
    )
    return response.data
  },

  /**
   * List all service hook subscriptions
   */
  async listWebhooks() {
    const client = getAzureDevOpsClient()
    const response = await client.get(
      `/_apis/hooks/subscriptions?api-version=7.1`
    )
    return response.data.value
  },

  /**
   * Check if a webhook exists for a given URL
   */
  async webhookExists(webhookUrl: string) {
    const webhooks = await this.listWebhooks()
    return webhooks.find((hook: any) => hook.consumerInputs?.url === webhookUrl)
  },

  /**
   * Get repository information
   */
  async getRepository(project: string, repoName: string) {
    const client = getAzureDevOpsClient()
    const response = await client.get(
      `/${project}/_apis/git/repositories/${repoName}?api-version=7.1`
    )
    return response.data
  },

  /**
   * Get a branch reference
   */
  async getBranch(project: string, repoId: string, branchName: string) {
    const client = getAzureDevOpsClient()
    const response = await client.get(
      `/${project}/_apis/git/repositories/${repoId}/refs?filter=heads/${branchName}&api-version=7.1`
    )
    return response.data.value[0]
  },

  /**
   * Create a new branch
   */
  async createBranch(
    project: string,
    repoId: string,
    newBranchName: string,
    sourceSha: string
  ) {
    const client = getAzureDevOpsClient()
    const response = await client.post(
      `/${project}/_apis/git/repositories/${repoId}/refs?api-version=7.1`,
      [
        {
          name: `refs/heads/${newBranchName}`,
          oldObjectId: "0000000000000000000000000000000000000000",
          newObjectId: sourceSha,
        },
      ]
    )
    return response.data.value[0]
  },

  /**
   * Get file content from repository
   */
  async getFileContent(
    project: string,
    repoId: string,
    filePath: string,
    branch: string
  ) {
    const client = getAzureDevOpsClient()
    try {
      const response = await client.get(
        `/${project}/_apis/git/repositories/${repoId}/items?path=${filePath}&versionDescriptor.version=${branch}&api-version=7.1`
      )
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * Push changes to a branch
   */
  async pushChanges(
    project: string,
    repoId: string,
    branchName: string,
    filePath: string,
    fileContent: string,
    commitMessage: string,
    oldObjectId: string
  ) {
    const client = getAzureDevOpsClient()

    // Check if file exists to determine change type
    const existingFile = await this.getFileContent(
      project,
      repoId,
      `/${filePath}`,
      branchName
    )
    const changeType = existingFile ? "edit" : "add"

    const response = await client.post(
      `/${project}/_apis/git/repositories/${repoId}/pushes?api-version=7.1`,
      {
        refUpdates: [
          {
            name: `refs/heads/${branchName}`,
            oldObjectId,
          },
        ],
        commits: [
          {
            comment: commitMessage,
            changes: [
              {
                changeType,
                item: {
                  path: `/${filePath}`,
                },
                newContent: {
                  content: fileContent,
                  contentType: "rawtext",
                },
              },
            ],
          },
        ],
      }
    )
    return response.data
  },

  /**
   * Create a pull request
   */
  async createPullRequest(
    project: string,
    repoId: string,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string
  ) {
    const client = getAzureDevOpsClient()
    const response = await client.post(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1`,
      {
        sourceRefName: `refs/heads/${sourceBranch}`,
        targetRefName: `refs/heads/${targetBranch}`,
        title,
        description,
      }
    )
    return response.data
  },
}

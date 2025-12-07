import axios, { AxiosInstance } from "axios"

/**
 * GitLab configuration from environment variables
 */
const GITLAB_URL = "https://gitlab.com"
const GITLAB_PAT = process.env.GITLAB_PAT!

/**
 * Creates an authenticated axios instance for GitLab API
 * @returns Axios instance with proper authentication headers
 */
export function getGitLabClient(): AxiosInstance {
  if (!GITLAB_PAT) {
    throw new Error(
      "GITLAB_PAT environment variable is not set. Please add it to your .env.local file."
    )
  }

  return axios.create({
    baseURL: `${GITLAB_URL}/api/v4`,
    headers: {
      "PRIVATE-TOKEN": GITLAB_PAT,
      "Content-Type": "application/json",
    },
  })
}

/**
 * GitLab API helper functions
 */
export const gitlab = {
  /**
   * Get GitLab URL
   */
  getUrl: () => GITLAB_URL,

  /**
   * Get project information
   */
  async getProject(projectPath: string) {
    const client = getGitLabClient()
    const encodedPath = encodeURIComponent(projectPath)
    const response = await client.get(`/projects/${encodedPath}`)
    return response.data
  },

  /**
   * Create a project hook (webhook)
   */
  async createWebhook(projectId: number, webhookUrl: string) {
    const client = getGitLabClient()
    const response = await client.post(`/projects/${projectId}/hooks`, {
      url: webhookUrl,
      merge_requests_events: true, // Only MR events
      push_events: false, // Explicitly disable push events
      issues_events: false,
      wiki_page_events: false,
      pipeline_events: false,
      tag_push_events: false,
      note_events: false,
      enable_ssl_verification: true,
    })
    return response.data
  },

  /**
   * List all project hooks
   */
  async listWebhooks(projectId: number) {
    const client = getGitLabClient()
    const response = await client.get(`/projects/${projectId}/hooks`)
    return response.data
  },

  /**
   * Check if a webhook exists for a given URL
   */
  async webhookExists(projectId: number, webhookUrl: string) {
    const webhooks = await this.listWebhooks(projectId)
    return webhooks.find((hook: any) => hook.url === webhookUrl)
  },

  /**
   * Get a branch
   */
  async getBranch(projectId: number, branchName: string) {
    const client = getGitLabClient()
    const encodedBranch = encodeURIComponent(branchName)
    const response = await client.get(
      `/projects/${projectId}/repository/branches/${encodedBranch}`
    )
    return response.data
  },

  /**
   * Create a new branch
   */
  async createBranch(projectId: number, newBranchName: string, ref: string) {
    const client = getGitLabClient()
    const response = await client.post(
      `/projects/${projectId}/repository/branches`,
      {
        branch: newBranchName,
        ref,
      }
    )
    return response.data
  },

  /**
   * Get file content from repository
   */
  async getFile(projectId: number, filePath: string, ref: string) {
    const client = getGitLabClient()
    const encodedPath = encodeURIComponent(filePath)
    try {
      const response = await client.get(
        `/projects/${projectId}/repository/files/${encodedPath}?ref=${ref}`
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
   * Update file in repository
   */
  async updateFile(
    projectId: number,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string
  ) {
    const client = getGitLabClient()
    const encodedPath = encodeURIComponent(filePath)
    const response = await client.put(
      `/projects/${projectId}/repository/files/${encodedPath}`,
      {
        branch,
        content,
        commit_message: commitMessage,
      }
    )
    return response.data
  },

  /**
   * Create a merge request
   */
  async createMergeRequest(
    projectId: number,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string
  ) {
    const client = getGitLabClient()
    const response = await client.post(
      `/projects/${projectId}/merge_requests`,
      {
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title,
        description,
      }
    )
    return response.data
  },
}

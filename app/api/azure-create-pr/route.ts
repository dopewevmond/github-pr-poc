import { NextResponse } from "next/server"
import { azureDevOps } from "@/lib/azure-devops"

// Hardcoded configuration
const PROJECT = "scan-repos"
const REPO_NAME = "hackable"
const BASE_BRANCH = "master"
const FILE_PATH = "static/script.js"
const FILE_CONTENT = `// This is an automatically generated file created by the Azure DevOps PR POC
console.log('Hello from Azure DevOps automated PR!');
`
const COMMIT_MESSAGE = "Add script.js via Azure DevOps API"
const PR_TITLE = "Automated PR: Add script.js"
const PR_BODY =
  "This pull request was automatically created using the Azure DevOps REST API with PAT authentication."
const WEBHOOK_BASE_URL = "magical-fly-sensibly.ngrok-free.app"

/**
 * Ensures a webhook exists for the repository
 */
async function ensureWebhookExists(
  projectId: string,
  repositoryId: string,
  baseUrl: string
) {
  const webhookUrl = `https://${baseUrl}/api/azure-webhook`

  // Check if webhook already exists
  const existingHook = await azureDevOps.webhookExists(webhookUrl)

  if (existingHook) {
    console.log(`Webhook already exists for ${webhookUrl}`)
    return existingHook
  }

  // Create webhook for PR updated only
  console.log(`Creating webhook for ${webhookUrl}`)
  const hook = await azureDevOps.createWebhook(
    projectId,
    repositoryId,
    webhookUrl,
    "git.pullrequest.updated"
  )

  console.log(`Webhook created successfully`)
  return hook
}

export async function POST() {
  try {
    // Get project information to obtain project ID
    const project = await azureDevOps.getProject(PROJECT)
    const projectId = project.id

    // Get repository information
    const repo = await azureDevOps.getRepository(PROJECT, REPO_NAME)
    const repoId = repo.id

    // Ensure webhook exists
    await ensureWebhookExists(projectId, repoId, WEBHOOK_BASE_URL)

    // Get the base branch reference
    const baseBranch = await azureDevOps.getBranch(PROJECT, repoId, BASE_BRANCH)

    if (!baseBranch) {
      throw new Error(`Base branch '${BASE_BRANCH}' not found`)
    }

    const baseSha = baseBranch.objectId

    // Create a new branch
    const newBranchName = `feature/auto-pr-${Date.now()}`
    await azureDevOps.createBranch(PROJECT, repoId, newBranchName, baseSha)

    // Push changes to the new branch
    await azureDevOps.pushChanges(
      PROJECT,
      repoId,
      newBranchName,
      FILE_PATH,
      FILE_CONTENT,
      COMMIT_MESSAGE,
      baseSha
    )

    // Create a pull request
    const pr = await azureDevOps.createPullRequest(
      PROJECT,
      repoId,
      newBranchName,
      BASE_BRANCH,
      PR_TITLE,
      PR_BODY
    )

    return NextResponse.json({
      success: true,
      pullRequest: {
        id: pr.pullRequestId,
        url: `${azureDevOps.getOrgUrl()}/${PROJECT}/_git/${REPO_NAME}/pullrequest/${
          pr.pullRequestId
        }`,
        title: pr.title,
        branch: newBranchName,
      },
    })
  } catch (error) {
    console.error("Error creating Azure DevOps PR:", error)

    const err = error as {
      message?: string
      response?: { data?: any; status?: number }
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create pull request",
        details: err.response?.data || null,
      },
      { status: err.response?.status || 500 }
    )
  }
}

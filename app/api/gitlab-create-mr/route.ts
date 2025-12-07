import { NextResponse } from "next/server"
import { gitlab } from "@/lib/gitlab"

// Hardcoded configuration
const PROJECT_PATH = "dopewevmond/vc-snippets"
const BASE_BRANCH = "rezliant"
const FILE_PATH = "CSRF/csrf-change-email/vsnippet/8-CSRF-change-email.php"
const FILE_CONTENT = `<?php
// This file was automatically modified by the GitLab MR POC
// Timestamp: ${new Date().toISOString()}

// CSRF Change Email vulnerability snippet
// Modified via GitLab API
?>
`
const COMMIT_MESSAGE = "Update CSRF change email file via GitLab API"
const MR_TITLE = "Automated MR: Update CSRF file"
const MR_BODY =
  "This merge request was automatically created using the GitLab REST API with PAT authentication."
const WEBHOOK_BASE_URL = "magical-fly-sensibly.ngrok-free.app"

/**
 * Ensures a webhook exists for the repository
 * Returns null if webhook management fails (e.g., insufficient permissions)
 */
async function ensureWebhookExists(projectId: number, baseUrl: string) {
  try {
    const webhookUrl = `https://${baseUrl}/api/gitlab-webhook`

    // Check if webhook already exists
    const existingHook = await gitlab.webhookExists(projectId, webhookUrl)

    if (existingHook) {
      console.log(`Webhook already exists for ${webhookUrl}`)
      return existingHook
    }

    // Create webhook for MR updates only
    console.log(`Creating webhook for ${webhookUrl}`)
    const hook = await gitlab.createWebhook(projectId, webhookUrl)

    console.log(`Webhook created successfully`)
    return hook
  } catch (error: any) {
    // If we get a 403, the PAT doesn't have webhook permissions
    if (error.response?.status === 403) {
      console.warn(
        "Warning: Unable to manage webhooks. Your GitLab PAT needs 'api' scope with Maintainer/Owner permissions to create webhooks."
      )
      console.warn("Continuing without webhook setup...")
      return null
    }
    // Re-throw other errors
    throw error
  }
}

export async function POST() {
  try {
    // Get project information to obtain project ID
    const project = await gitlab.getProject(PROJECT_PATH)
    const projectId = project.id

    // Ensure webhook exists
    await ensureWebhookExists(projectId, WEBHOOK_BASE_URL)

    // Get the base branch
    const baseBranch = await gitlab.getBranch(projectId, BASE_BRANCH)

    if (!baseBranch) {
      throw new Error(`Base branch '${BASE_BRANCH}' not found`)
    }

    // Create a new branch
    const newBranchName = `feature/auto-mr-${Date.now()}`
    await gitlab.createBranch(projectId, newBranchName, BASE_BRANCH)

    // Update the file in the new branch
    await gitlab.updateFile(
      projectId,
      FILE_PATH,
      newBranchName,
      FILE_CONTENT,
      COMMIT_MESSAGE
    )

    // Create a merge request
    const mr = await gitlab.createMergeRequest(
      projectId,
      newBranchName,
      BASE_BRANCH,
      MR_TITLE,
      MR_BODY
    )

    return NextResponse.json({
      success: true,
      mergeRequest: {
        iid: mr.iid,
        url: mr.web_url,
        title: mr.title,
        branch: newBranchName,
      },
    })
  } catch (error) {
    console.error("Error creating GitLab MR:", error)

    const err = error as {
      message?: string
      response?: { data?: any; status?: number }
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create merge request",
        details: err.response?.data || null,
      },
      { status: err.response?.status || 500 }
    )
  }
}

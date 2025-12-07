import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"
import { getInstallationAccessToken } from "@/lib/github-app"

/**
 * Checks if a webhook exists for the given domain and creates one if it doesn't
 */
async function ensureWebhookExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseUrl: string
) {
  const webhookUrl = `https://${baseUrl}/api/webhook`
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not set - webhook will be created without signature verification"
    )
  }

  // Get all webhooks for the repository
  const { data: hooks } = await octokit.rest.repos.listWebhooks({
    owner,
    repo,
  })

  // Check if a webhook already exists for this domain
  const existingHook = hooks.find((hook) => hook.config.url === webhookUrl)

  if (existingHook) {
    console.log(`Webhook already exists for ${webhookUrl}`)
    return existingHook
  }

  // Create a new webhook
  console.log(`Creating webhook for ${webhookUrl}`)
  const { data: newHook } = await octokit.rest.repos.createWebhook({
    owner,
    repo,
    config: {
      url: webhookUrl,
      content_type: "json",
      insecure_ssl: "0",
      ...(webhookSecret && { secret: webhookSecret }),
    },
    events: ["pull_request"],
    active: true,
  })

  console.log(`Webhook created successfully with ID: ${newHook.id}`)
  return newHook
}

// Hardcoded configuration
const REPO_OWNER = "dopewevmond" // Replace with your GitHub username or org
const REPO_NAME = "hackable" // Replace with your repository name
const BASE_BRANCH = "master"
const NEW_BRANCH = `feature/auto-pr-${Date.now()}`
const FILE_PATH = "example.txt"
const FILE_CONTENT =
  "This is an automatically generated file created by the GitHub PR POC."
const COMMIT_MESSAGE = "Add example file via API"
const PR_TITLE = "Automated PR: Add example file"
const PR_BODY =
  "This pull request was automatically created using the GitHub REST API and a GitHub App for authentication."
const WEBHOOK_BASE_URL = "magical-fly-sensibly.ngrok-free.app"

export async function POST() {
  try {
    // Get installation access token
    const token = await getInstallationAccessToken()

    // Initialize Octokit with the installation token
    const octokit = new Octokit({
      auth: token,
    })

    // Check and create webhook if needed
    await ensureWebhookExists(octokit, REPO_OWNER, REPO_NAME, WEBHOOK_BASE_URL)

    // Step 1: Get the reference to the base branch (main)
    const { data: refData } = await octokit.rest.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BASE_BRANCH}`,
    })

    const baseSha = refData.object.sha

    // Step 2: Create a new branch from main
    await octokit.rest.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${NEW_BRANCH}`,
      sha: baseSha,
    })

    // Step 3: Create or update the file in the new branch
    // First, check if file exists to get its SHA (required for updates)
    let fileSha: string | undefined
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
        ref: NEW_BRANCH,
      })

      if ("sha" in fileData) {
        fileSha = fileData.sha
      }
    } catch (error) {
      // File doesn't exist, which is fine for creating new files
      const err = error as { status?: number }
      if (err.status !== 404) {
        throw error
      }
    }

    // Create or update the file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: COMMIT_MESSAGE,
      content: Buffer.from(FILE_CONTENT).toString("base64"),
      branch: NEW_BRANCH,
      ...(fileSha && { sha: fileSha }), // Include SHA if updating existing file
    })

    // Step 4: Create a pull request
    const { data: prData } = await octokit.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: PR_TITLE,
      body: PR_BODY,
      head: NEW_BRANCH,
      base: BASE_BRANCH,
    })

    return NextResponse.json({
      success: true,
      pullRequest: {
        number: prData.number,
        url: prData.html_url,
        title: prData.title,
        branch: NEW_BRANCH,
      },
    })
  } catch (error) {
    console.error("Error creating PR:", error)

    const err = error as {
      message?: string
      status?: number
      response?: { data?: unknown }
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create pull request",
        details: err.response?.data || null,
      },
      { status: err.status || 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"

const GITLAB_WEBHOOK_TOKEN = process.env.GITLAB_WEBHOOK_TOKEN

/**
 * Verify GitLab webhook token
 */
function verifyGitLabToken(token: string | null): boolean {
  if (!GITLAB_WEBHOOK_TOKEN) {
    console.warn("GITLAB_WEBHOOK_TOKEN not set - skipping token verification")
    return true // Allow if no token is configured
  }

  return token === GITLAB_WEBHOOK_TOKEN
}

export async function POST(request: NextRequest) {
  try {
    // Get the webhook event type from headers
    const event = request.headers.get("x-gitlab-event")
    const token = request.headers.get("x-gitlab-token")

    // Verify token
    if (!verifyGitLabToken(token)) {
      console.error("Invalid GitLab webhook token")
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    const payload = await request.json()

    // Log webhook details to console
    console.log("========================================")
    console.log("GitLab Webhook Received")
    console.log("========================================")
    console.log("Event Type:", event)
    console.log("Token:", token ? "Present" : "Not present")
    console.log("Timestamp:", new Date().toISOString())
    console.log("----------------------------------------")
    console.log("Payload:")
    console.log(JSON.stringify(payload, null, 2))
    console.log("========================================")

    // Handle specific event types
    switch (event) {
      case "Merge Request Hook":
        const mrAction = payload.object_attributes?.action
        console.log(
          `Merge Request ${mrAction}: !${payload.object_attributes?.iid} - ${payload.object_attributes?.title}`
        )
        console.log(`Author: ${payload.user?.name}`)
        console.log(
          `Source: ${payload.object_attributes?.source_branch} -> Target: ${payload.object_attributes?.target_branch}`
        )
        console.log(`State: ${payload.object_attributes?.state}`)
        console.log(`Status: ${payload.object_attributes?.merge_status}`)
        break

      case "Push Hook":
        console.log(`Push to ${payload.ref} by ${payload.user_name}`)
        console.log(`Commits: ${payload.total_commits_count || 0}`)
        if (payload.commits?.length > 0) {
          payload.commits.forEach((commit: any) => {
            console.log(`  - ${commit.id.substring(0, 7)}: ${commit.message}`)
          })
        }
        break

      case "Issue Hook":
        console.log(
          `Issue ${payload.object_attributes?.action}: #${payload.object_attributes?.iid} - ${payload.object_attributes?.title}`
        )
        console.log(`State: ${payload.object_attributes?.state}`)
        break

      case "Note Hook":
        const noteableType = payload.object_attributes?.noteable_type
        console.log(`Comment on ${noteableType}`)
        if (noteableType === "MergeRequest") {
          console.log(`MR: !${payload.merge_request?.iid}`)
        }
        break

      case "Pipeline Hook":
        console.log(
          `Pipeline ${payload.object_attributes?.status}: #${payload.object_attributes?.id}`
        )
        console.log(`Ref: ${payload.object_attributes?.ref}`)
        break

      default:
        console.log(`Received ${event} event`)
    }

    // Return a 200 response to acknowledge receipt
    return NextResponse.json({
      success: true,
      received: true,
      event,
    })
  } catch (error) {
    console.error("Error processing GitLab webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"

const AZURE_WEBHOOK_USERNAME = process.env.AZURE_WEBHOOK_USERNAME
const AZURE_WEBHOOK_PASSWORD = process.env.AZURE_WEBHOOK_PASSWORD

/**
 * Verify Azure DevOps webhook basic auth
 */
function verifyAzureAuth(request: NextRequest): boolean {
  if (!AZURE_WEBHOOK_USERNAME || !AZURE_WEBHOOK_PASSWORD) {
    console.warn("Azure webhook auth not configured - skipping verification")
    return true // Allow if no auth is configured
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  const base64Credentials = authHeader.slice(6)
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8")
  const [username, password] = credentials.split(":")

  return (
    username === AZURE_WEBHOOK_USERNAME && password === AZURE_WEBHOOK_PASSWORD
  )
}

export async function POST(request: NextRequest) {
  try {
    // Verify basic auth
    if (!verifyAzureAuth(request)) {
      console.error("Invalid Azure DevOps webhook authentication")
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    const payload = await request.json()

    // Azure DevOps sends different event types in the payload
    const eventType = payload.eventType
    const resourceType = payload.resource?.repository?.name || "unknown"

    // Log webhook details to console
    console.log("========================================")
    console.log("Azure DevOps Webhook Received")
    console.log("========================================")
    console.log("Event Type:", eventType)
    console.log("Resource Type:", payload.resourceVersion)
    console.log("Timestamp:", new Date().toISOString())
    console.log("----------------------------------------")
    console.log("Headers:")
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log(JSON.stringify(headers, null, 2))
    console.log("----------------------------------------")
    console.log("Payload:")
    console.log(JSON.stringify(payload, null, 2))
    console.log("========================================")

    console.log(
      JSON.stringify(
        {
          pr_status: payload?.resource?.status,
          url: payload?.resource?._links?.web?.href,
        },
        null,
        2
      )
    )

    // Handle specific event types
    switch (eventType) {
      case "git.pullrequest.created":
        console.log(
          `Pull Request Created: #${payload.resource?.pullRequestId} - ${payload.resource?.title}`
        )
        console.log(`Created by: ${payload.resource?.createdBy?.displayName}`)
        console.log(
          `Source: ${payload.resource?.sourceRefName} -> Target: ${payload.resource?.targetRefName}`
        )
        break

      case "git.pullrequest.updated":
        console.log(
          `Pull Request Updated: #${payload.resource?.pullRequestId} - ${payload.resource?.title}`
        )
        console.log(`Status: ${payload.resource?.status}`)
        break

      case "git.pullrequest.merged":
        console.log(
          `Pull Request Merged: #${payload.resource?.pullRequestId} - ${payload.resource?.title}`
        )
        console.log(`Merged by: ${payload.resource?.closedBy?.displayName}`)
        break

      case "git.push":
        console.log(
          `Push to ${payload.resource?.refUpdates?.[0]?.name} by ${payload.resource?.pushedBy?.displayName}`
        )
        console.log(`Commits: ${payload.resource?.commits?.length || 0}`)
        if (payload.resource?.commits?.length > 0) {
          payload.resource.commits.forEach((commit: any) => {
            console.log(
              `  - ${commit.commitId.substring(0, 7)}: ${commit.comment}`
            )
          })
        }
        break

      case "workitem.created":
        console.log(
          `Work Item Created: #${payload.resource?.id} - ${payload.resource?.fields?.["System.Title"]}`
        )
        break

      case "workitem.updated":
        console.log(
          `Work Item Updated: #${payload.resource?.id} - ${payload.resource?.fields?.["System.Title"]}`
        )
        break

      default:
        console.log(`Received ${eventType} event`)
    }

    // Return a 200 response to acknowledge receipt
    return NextResponse.json({
      success: true,
      received: true,
      eventType,
      resourceType,
    })
  } catch (error) {
    console.error("Error processing Azure DevOps webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
      },
      { status: 500 }
    )
  }
}

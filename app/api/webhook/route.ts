import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not set - skipping signature verification"
    )
    return true // Allow if no secret is configured
  }

  if (!signature) {
    return false
  }

  const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET)
  const digest = "sha256=" + hmac.update(payload).digest("hex")

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(request: NextRequest) {
  try {
    // Get the webhook event type from headers
    const event = request.headers.get("x-github-event")
    const delivery = request.headers.get("x-github-delivery")
    const signature = request.headers.get("x-hub-signature-256")

    // Get raw body for signature verification
    const body = await request.text()

    // Verify signature
    if (!verifyGitHubSignature(body, signature)) {
      console.error("Invalid GitHub webhook signature")
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    const payload = JSON.parse(body)

    // Log webhook details to console
    console.log("========================================")
    console.log("GitHub Webhook Received")
    console.log("========================================")
    console.log("Event Type:", event)
    console.log("Delivery ID:", delivery)
    console.log("Signature:", signature)
    console.log("Timestamp:", new Date().toISOString())
    console.log("----------------------------------------")
    console.log("Headers:")
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log(JSON.stringify(headers, null, 2))
    console.log("----------------------------------------")
    // console.log("Payload:")
    // console.log(JSON.stringify(payload, null, 2))
    // console.log("this is the payload", payload)
    console.log(
      JSON.stringify(
        {
          pr_status: payload?.pull_request?.state,
          url: payload?.pull_request?.html_url,
        },
        null,
        2
      )
    )
    console.log("========================================")

    // Handle specific event types if needed
    switch (event) {
      case "pull_request":
        console.log(
          `Pull Request ${payload.action}: #${payload.pull_request?.number} - ${payload.pull_request?.title}`
        )
        break
      case "push":
        console.log(`Push to ${payload.ref} by ${payload.pusher?.name}`)
        break
      case "issues":
        console.log(
          `Issue ${payload.action}: #${payload.issue?.number} - ${payload.issue?.title}`
        )
        break
      case "issue_comment":
        console.log(
          `Comment ${payload.action} on issue #${payload.issue?.number}`
        )
        break
      default:
        console.log(`Received ${event} event`)
    }

    // Return a 200 response to acknowledge receipt
    return NextResponse.json({
      success: true,
      received: true,
      event,
      delivery,
    })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
      },
      { status: 500 }
    )
  }
}

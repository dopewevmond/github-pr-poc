import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get the webhook event type from headers
    const event = request.headers.get("x-github-event")
    const delivery = request.headers.get("x-github-delivery")
    const signature = request.headers.get("x-hub-signature-256")

    // Parse the webhook payload
    const payload = await request.json()

    // Log webhook details to console
    console.log("========================================")
    console.log("GitHub Webhook Received")
    console.log("========================================")
    console.log("Event Type:", event)
    console.log("Delivery ID:", delivery)
    console.log("Signature:", signature)
    console.log("Timestamp:", new Date().toISOString())
    console.log("----------------------------------------")
    // console.log("Payload:")
    // console.log(JSON.stringify(payload, null, 2))
    // console.log("this is the payload", payload)
    console.log(
      JSON.stringify(
        {
          pr_status: payload?.pull_request?.state,
          url: payload?.pull_request?.url,
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

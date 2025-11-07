import { createAppAuth } from "@octokit/auth-app"

/**
 * GitHub App configuration from environment variables
 */
const GITHUB_APP_ID = process.env.GITHUB_APP_ID!
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!
const GITHUB_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID!

/**
 * Generates an installation access token using GitHub App credentials
 * @returns Installation access token that can be used to authenticate API requests
 */
export async function getInstallationAccessToken(): Promise<string> {
  // Create authentication instance for GitHub App
  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_APP_PRIVATE_KEY,
    installationId: GITHUB_INSTALLATION_ID,
  })

  // Request an installation access token
  const { token } = await auth({
    type: "installation",
  })

  return token
}

/**
 * Creates an authenticated Octokit instance with the installation token
 * This is a helper for direct use with Octokit REST API
 */
export async function getAuthenticatedOctokit() {
  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_APP_PRIVATE_KEY,
    installationId: GITHUB_INSTALLATION_ID,
  })

  return auth
}

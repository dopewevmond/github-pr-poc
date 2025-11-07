"use client";

import { useState } from "react";

interface PullRequestResult {
  success: boolean;
  pullRequest: {
    number: number;
    url: string;
    title: string;
    branch: string;
  };
}

export default function CreatePRPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PullRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePR = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/create-pr", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Failed to create PR");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">GitHub PR Creator</h1>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Make sure you&apos;ve configured the repository owner and name in{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                /app/api/create-pr/route.ts
              </code>
            </li>
            <li>Ensure your GitHub App has the correct permissions</li>
            <li>Click the button below to create a test PR</li>
          </ol>
        </div>

        <button
          onClick={handleCreatePR}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? "Creating PR..." : "Create Pull Request"}
        </button>

        {result && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
              ✓ Pull Request Created Successfully!
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>PR Number:</strong> #{result.pullRequest.number}
              </p>
              <p>
                <strong>Title:</strong> {result.pullRequest.title}
              </p>
              <p>
                <strong>Branch:</strong> {result.pullRequest.branch}
              </p>
              <p>
                <strong>URL:</strong>{" "}
                <a
                  href={result.pullRequest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  {result.pullRequest.url}
                </a>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
              ✗ Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Configuration Required
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Before testing, update{" "}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
              REPO_OWNER
            </code>{" "}
            and{" "}
            <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">
              REPO_NAME
            </code>{" "}
            in the API route.
          </p>
        </div>
      </main>
    </div>
  );
}

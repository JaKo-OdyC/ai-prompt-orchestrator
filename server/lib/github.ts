import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Helper functions for repository operations
export async function createRepository(name: string, description?: string, isPrivate = false) {
  const octokit = await getUncachableGitHubClient();
  
  try {
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true
    });
    
    return data;
  } catch (error: any) {
    if (error.status === 422 && error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
      // Repository already exists, get it instead
      const user = await octokit.rest.users.getAuthenticated();
      const { data } = await octokit.rest.repos.get({
        owner: user.data.login,
        repo: name
      });
      return data;
    }
    throw error;
  }
}

export async function pushToRepository(owner: string, repo: string, files: Array<{path: string, content: string}>, commitMessage: string) {
  const octokit = await getUncachableGitHubClient();
  
  // Get the current commit SHA
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: 'heads/main'
  });
  
  const currentCommitSha = ref.object.sha;
  
  // Get the current tree
  const { data: currentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha
  });
  
  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha
      };
    })
  );
  
  // Create a new tree
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: currentCommit.tree.sha,
    tree: blobs
  });
  
  // Create a new commit
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [currentCommitSha]
  });
  
  // Update the reference
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: 'heads/main',
    sha: newCommit.sha
  });
  
  return newCommit;
}
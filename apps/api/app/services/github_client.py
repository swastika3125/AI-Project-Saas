import httpx
from typing import Dict, List, Optional, Any


class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PR-Risk-Intelligence-App"
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    async def get_pr_files(self, repo_full_name: str, pr_number: int) -> List[Dict[str, Any]]:
        """Fetches list of changed files with their patch contents."""
        url = f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}/files"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=self.headers)
            if resp.status_code == 200:
                return resp.json()
            return []

    async def post_pr_comment(self, repo_full_name: str, pr_number: int, comment_body: str) -> bool:
        """Posts a markdown analysis comment to the GitHub PR conversation."""
        url = f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=self.headers, json={"body": comment_body})
            return resp.status_code in (200, 201)

    async def set_commit_status(
        self,
        repo_full_name: str,
        commit_sha: str,
        state: str,  # pending, success, failure, error
        description: str,
        target_url: str
    ) -> bool:
        """Sets a commit status check on GitHub."""
        url = f"https://api.github.com/repos/{repo_full_name}/statuses/{commit_sha}"
        payload = {
            "state": state,
            "target_url": target_url,
            "description": description[:140],
            "context": "PR Risk Intelligence"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=self.headers, json=payload)
            return resp.status_code in (200, 201)

export type ReadmeDestination = { url: string; label: string; instruction: string; kind: 'edit' | 'create-file' | 'create-repo' | 'private' | 'unknown' };

export async function readmeDestination(login: string, token?: string, fetcher: typeof fetch = fetch): Promise<ReadmeDestination> {
  const owner = encodeURIComponent(login);
  const repositoryUrl = `https://github.com/${owner}/${owner}`;
  const fallback: ReadmeDestination = { kind:'unknown', url:repositoryUrl, label:'Open profile repository', instruction:'We could not check your README. Open your profile repository, edit its README, paste the card, and commit your changes.' };
  const headers = { accept:'application/vnd.github+json', 'user-agent':'tokpop', ...(token ? { authorization:`Bearer ${token}` } : {}) };
  try {
    const repository = await fetcher(`https://api.github.com/repos/${owner}/${owner}`, { headers, signal:AbortSignal.timeout(6000), cache:'no-store', redirect:'error' });
    if (repository.status === 404) return { kind:'create-repo', url:`https://github.com/new?name=${owner}&description=My%20profile&readme=1`, label:'Set up profile README', instruction:`No accessible profile repository was found. Create a public repository named ${login} with a README. Then edit the README, paste your card, and commit. If the repository already exists, check its visibility.` };
    if (!repository.ok) return fallback;
    const repo = await repository.json() as { private?: boolean; default_branch?: string };
    if (repo.private) return { kind:'private', url:repositoryUrl, label:'Open private profile repository', instruction:'Your profile repository is private. GitHub only displays a public profile README. Review its contents before deciding whether to make it public.' };
    if (!repo.default_branch) return fallback;
    const branch = encodeURIComponent(repo.default_branch);
    const response = await fetcher(`https://api.github.com/repos/${owner}/${owner}/readme`, { headers, signal:AbortSignal.timeout(6000), cache:'no-store', redirect:'error' });
    if (response.status === 404) return { kind:'create-file', url:`${repositoryUrl}/new/${branch}?filename=README.md`, label:'Create profile README', instruction:'Paste your card into the new README.md file, then commit your changes on GitHub.' };
    if (!response.ok) return fallback;
    const readme = await response.json() as { path?: string };
    if (!readme.path || readme.path.split('/').some((part) => part === '..')) return fallback;
    if (!/\.(md|markdown|mdown|mkdn)$/i.test(readme.path)) return { ...fallback, instruction:'Your README uses a different format. The copied card uses Markdown: convert your profile README to README.md, preserving its existing content, or adapt the embed to its current format before pasting.' };
    return { kind:'edit', url:`${repositoryUrl}/edit/${branch}/${readme.path.split('/').map(encodeURIComponent).join('/')}`, label:'Open README editor', instruction:'Paste the card where you want it in your existing README, then commit your changes on GitHub.' };
  } catch { return fallback; }
}

import { describe, expect, it, vi } from 'vitest';
import { readmeDestination } from './readme-destination';
const response = (body: object, status = 200) => new Response(JSON.stringify(body), { status });
describe('guided README handoff', () => {
  it('opens the actual README editor on the actual default branch', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ private:false,default_branch:'profile/main' })).mockResolvedValueOnce(response({ path:'README.md' }));
    expect(await readmeDestination('builder','token',fetcher)).toMatchObject({ kind:'edit', url:'https://github.com/builder/builder/edit/profile%2Fmain/README.md' });
    expect(fetcher.mock.calls.every(([,options]) => !options.method || options.method === 'GET')).toBe(true);
  });
  it('does not send Markdown into an incompatible README editor', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ default_branch:'main' })).mockResolvedValueOnce(response({ path:'README.rst' }));
    expect(await readmeDestination('builder',undefined,fetcher)).toMatchObject({ kind:'unknown', instruction:expect.stringContaining('different format') });
  });
  it('helps create missing repositories without claiming inaccessible ones cannot exist', async () => {
    const result = await readmeDestination('builder',undefined,vi.fn().mockResolvedValue(response({},404)));
    expect(result.kind).toBe('create-repo');
    expect(result.instruction).toContain('If the repository already exists');
    expect(result.url).toContain('github.com/new?name=builder');
  });
  it('helps create a missing README and does not assume main', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ default_branch:'master' })).mockResolvedValueOnce(response({},404));
    expect(await readmeDestination('builder',undefined,fetcher)).toMatchObject({ kind:'create-file',url:'https://github.com/builder/builder/new/master?filename=README.md' });
  });
  it('does not quietly make private repositories public', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ private:true }));
    expect((await readmeDestination('builder',undefined,fetcher)).kind).toBe('private');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('offers a manual fallback on rate limits or network failures', async () => {
    expect((await readmeDestination('builder',undefined,vi.fn().mockResolvedValue(response({},403)))).kind).toBe('unknown');
    expect((await readmeDestination('builder',undefined,vi.fn().mockRejectedValue(new Error('offline')))).kind).toBe('unknown');
  });
});

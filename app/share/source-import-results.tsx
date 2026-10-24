import type { SetupReceipt } from '../../lib/setup-progress';

const sources = [['codex', 'Codex'], ['claude_code', 'Claude Code'], ['cursor', 'Cursor'], ['gemini_cli', 'Gemini CLI'], ['copilot_cli', 'Copilot CLI']] as const;

export function SourceImportResults({ receipt }: { receipt: SetupReceipt }) {
  return <div className="source-import-results">
    <h3>Your upload, tool by tool</h3>
    <ul>{sources.map(([id, label]) => <li key={id}><strong>{label}</strong><span className={receipt.sources.includes(id) ? 'received' : ''}>{receipt.sources.includes(id) ? '✓ Activity received' : 'No activity in this upload'}</span></li>)}</ul>
    <p>A missing tool is not a failed connection. Its history may be empty, unavailable, or on another computer. Terminal shows collection errors; use <code>doctor</code> to check detection. No need to pair again.</p>
  </div>;
}

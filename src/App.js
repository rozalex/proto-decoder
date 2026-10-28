import React, { useMemo, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { util } from 'protobufjs';
import { JSONTree } from 'react-json-tree';
import { priority } from '@priority-software/priority-proto-api/lib/nform';
import './App.css';

const form = priority.netitems.form;
const ngtw = priority.netitems.ngtw;
const version = "2.0.1";

console.log(version);

const STORAGE_KEY = 'proto-decoder:type';
const MONO = '"JetBrains Mono", "Cascadia Code", "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';
const HIGHLIGHT_LIMIT = 200000;

const decoders = Object.entries({ ...form, ...ngtw })
  .filter(([, type]) => typeof type.decode === 'function')
  .map(([label, type]) => ({
    label,
    type,
    kind: label.endsWith('Rq') ? 'req' : label.endsWith('Rs') ? 'res' : null,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

// Accept text copied straight from the Network tab: quotes, line breaks, base64url.
const normalize = (text) =>
  text.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');

function decode(text, decoder) {
  const input = normalize(text);
  if (!input) return { status: 'empty' };

  let bytes;
  try {
    bytes = util.newBuffer(util.base64.length(input));
    util.base64.decode(input, bytes, 0);
  } catch {
    return { status: 'error', message: 'Input is not valid base64' };
  }

  if (!decoder) return { status: 'idle', size: bytes.length };

  try {
    const data = decoder.type.decode(bytes).toJSON();
    return { status: 'ok', size: bytes.length, data };
  } catch (err) {
    return { status: 'error', size: bytes.length, message: `Not a valid ${decoder.label}: ${err.message}` };
  }
}

const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function highlightJson(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(JSON_TOKEN)) {
    const [token, str, colon] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const kind = str ? (colon ? 'key' : 'str') : token === 'null' ? 'null' : token === 'true' || token === 'false' ? 'bool' : 'num';
    parts.push(<span key={match.index} className={`j-${kind}`}>{str || token}</span>);
    if (colon) parts.push(colon);
    last = match.index + token.length;
  }
  parts.push(text.slice(last));
  return parts;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // DevTools panels often block the async clipboard API.
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
}

const ICONS = {
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  clear: <path d="M18 6 6 18M6 6l12 12" />,
  maximize: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
  minimize: <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />,
  unfold: <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />,
  fold: <path d="m7 20 5-5 5 5M7 4l5 5 5-5" />,
};

const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffb454' },
    background: { default: '#0e1014', paper: '#171a21' },
    text: { primary: '#d5d9e0', secondary: '#7f8794' },
    divider: '#262b35',
  },
  typography: { fontFamily: MONO, fontSize: 12 },
  shape: { borderRadius: 6 },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--panel-2)',
          fontSize: 12,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--line-strong)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--faint)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--accent)', borderWidth: 1 },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          marginTop: 4,
          border: '1px solid var(--line-strong)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
          backgroundImage: 'none',
        },
        listbox: { padding: 4, maxHeight: 340 },
        option: {
          fontSize: 12,
          minHeight: '28px !important',
          borderRadius: 4,
          justifyContent: 'space-between !important',
          '&.Mui-focused': { backgroundColor: 'var(--panel-3) !important' },
          '&[aria-selected="true"]': { color: 'var(--accent)' },
        },
        noOptions: { fontSize: 12, color: 'var(--muted)' },
      },
    },
  },
});

const treeTheme = {
  extend: {
    base00: 'transparent',
    base03: '#4b5262',
    base07: '#d5d9e0',
    base08: '#ff7a85',
    base09: '#ffb454',
    base0B: '#a6da7c',
    base0D: '#8ab4f8',
  },
  tree: { margin: 0, backgroundColor: 'transparent', fontFamily: MONO, fontSize: 12, lineHeight: 1.55 },
  arrowSign: { color: 'var(--faint)' },
  nestedNodeItemString: ({ style }) => ({ style: { ...style, color: 'var(--faint)' } }),
};

const SAMPLE_BYTES = ['0A', '05', '46', '65', '74', '63', '68'];

function EmptyState({ title, hint, tone }) {
  return (
    <div className={`empty ${tone || ''}`}>
      <div className="byte-strip" aria-hidden="true">
        {SAMPLE_BYTES.map((byte, i) => (
          <span key={i} style={{ animationDelay: `${i * 140}ms` }}>{byte}</span>
        ))}
      </div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}

function App() {
  const [encodedText, setEncodedText] = useState('');
  const [decoderName, setDecoderName] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [view, setView] = useState('tree');
  const [expandAll, setExpandAll] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [copied, setCopied] = useState(false);

  const decoder = decoders.find((d) => d.label === decoderName) || null;
  const result = useMemo(() => decode(encodedText, decoder), [encodedText, decoder]);
  const json = useMemo(() => (result.data ? JSON.stringify(result.data, null, 2) : ''), [result]);
  const ok = result.status === 'ok';

  const selectDecoder = (option) => {
    const name = option ? option.label : '';
    setDecoderName(name);
    localStorage.setItem(STORAGE_KEY, name);
  };

  const handleCopy = async () => {
    await copyText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const status = {
    empty: { tone: 'muted', text: 'Ready. Paste a base64 payload to decode it.' },
    idle: { tone: 'warn', text: `${result.size} bytes. Choose a message type.` },
    error: { tone: 'error', text: result.message },
    ok: { tone: 'ok', text: `Decoded ${result.size} bytes as ${decoder?.label}` },
  }[result.status];

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <header className="toolbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="brand-name"><span>proto</span>decoder</span>
          </div>

          <Autocomplete
            className="type-picker"
            size="small"
            options={decoders}
            value={decoder}
            onChange={(event, option) => selectDecoder(option)}
            isOptionEqualToValue={(option, value) => option.label === value.label}
            autoHighlight
            openOnFocus
            renderOption={(props, option) => (
              <li {...props} key={option.label}>
                <span>{option.label}</span>
                {option.kind && <span className={`kind kind-${option.kind}`}>{option.kind}</span>}
              </li>
            )}
            renderInput={(params) => <TextField {...params} placeholder="Message type…" />}
          />

          <span className="toolbar-meta">api v{version}</span>
        </header>

        <main className={`workspace ${maximized ? 'maximized' : ''}`}>
          {!maximized && (
            <section className="pane input-pane">
              <div className="pane-header">
                <span className="pane-label"><b>01</b>Input</span>
                <span className="pane-meta">{encodedText.length.toLocaleString()} chars</span>
                <div className="pane-actions">
                  <button className="icon-btn" title="Clear" onClick={() => setEncodedText('')} disabled={!encodedText}>
                    <Icon name="clear" />
                  </button>
                </div>
              </div>
              <textarea
                className="input"
                value={encodedText}
                onChange={(event) => setEncodedText(event.target.value)}
                placeholder="Paste base64-encoded protobuf here…"
                spellCheck={false}
                autoFocus
              />
            </section>
          )}

          <section className="pane output-pane">
            <div className="pane-header">
              <span className="pane-label"><b>02</b>Output</span>
              {ok && (
                <span className="pane-meta">
                  <span className="type-chip">{decoder.label}</span>
                  {Object.keys(result.data).length} fields
                </span>
              )}
              <div className="pane-actions">
                <div className="segmented" role="tablist">
                  {['tree', 'json'].map((v) => (
                    <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                      {v}
                    </button>
                  ))}
                </div>
                {view === 'tree' && (
                  <button className="icon-btn" title={expandAll ? 'Collapse all' : 'Expand all'} onClick={() => setExpandAll(!expandAll)} disabled={!ok}>
                    <Icon name={expandAll ? 'fold' : 'unfold'} />
                  </button>
                )}
                <button className={`icon-btn ${copied ? 'copied' : ''}`} title="Copy JSON" onClick={handleCopy} disabled={!ok}>
                  <Icon name={copied ? 'check' : 'copy'} />
                </button>
                <button className="icon-btn" title={maximized ? 'Restore' : 'Maximize'} onClick={() => setMaximized(!maximized)}>
                  <Icon name={maximized ? 'minimize' : 'maximize'} />
                </button>
              </div>
            </div>

            <div className="output">
              {result.status === 'empty' && <EmptyState title="Nothing to decode yet" hint="Paste a payload from the Network tab. Quotes and line breaks are ignored." />}
              {result.status === 'idle' && <EmptyState title={`${result.size} bytes ready`} hint="Choose a message type in the toolbar to decode them." />}
              {result.status === 'error' && <EmptyState tone="error" title="Couldn't decode" hint={result.message} />}
              {ok && view === 'tree' && (
                <div className="reveal">
                  <JSONTree
                    key={String(expandAll)}
                    data={result.data}
                    theme={treeTheme}
                    hideRoot
                    shouldExpandNodeInitially={(keyPath, data, level) => expandAll || level < 2}
                  />
                </div>
              )}
              {ok && view === 'json' && (
                <pre className="reveal json">{json.length > HIGHLIGHT_LIMIT ? json : highlightJson(json)}</pre>
              )}
            </div>
          </section>
        </main>

        <footer className={`statusbar tone-${status.tone}`}>
          <span className="status-dot" />
          <span className="status-text">{status.text}</span>
          <span className="status-meta">{decoders.length} message types</span>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;

import React, { useMemo, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { util } from 'protobufjs';
import { JSONTree } from 'react-json-tree';
import { priority } from '@priority-software/priority-proto-api/lib/nform';
import soapOperations from './soapOperations.json';
import './App.css';

const { form, ngtw, ngen, nrule } = priority.netitems;
const version = "2.0.1";

console.log(version);

const STORAGE_KEY = 'proto-decoder:type';
const MONO = '"JetBrains Mono", "Cascadia Code", "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace';
const HIGHLIGHT_LIMIT = 200000;

const decoders = Object.entries({ ...form, ...ngtw, ...ngen, ...nrule })
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

// The payload is the text of the operation element's first child:
// <s:Body><OpResponse><OpResult>…</OpResult></OpResponse> or <s:Body><Op><request>…</request></Op>.
const SOAP_OPERATION = /<(?:[\w-]+:)?Body\b[^>]*>\s*<(?:[\w-]+:)?(\w+)[^>]*>\s*<(?:[\w-]+:)?\w+[^>]*>([^<]*)</;
const SOAP_FAULT = /<faultstring[^>]*>([^<]*)</;

function parseInput(text) {
  if (!text.trimStart().startsWith('<')) return { payload: text };

  const fault = text.match(SOAP_FAULT);
  if (fault) return { xml: true, error: `SOAP fault: ${fault[1]}` };

  const match = text.match(SOAP_OPERATION);
  if (!match) return { xml: true, error: 'No base64 payload found in the XML' };

  const [, element, payload] = match;
  const isResponse = element.endsWith('Response');
  const operation = isResponse ? element.slice(0, -'Response'.length) : element;
  const typeName = soapOperations[operation]?.[isResponse ? 'response' : 'request'];
  return { xml: true, payload, operation, isResponse, typeName };
}

function decode(input, decoder) {
  if (input.error) return { status: 'error', message: input.error };

  const payload = normalize(input.payload);
  if (!payload) return { status: 'empty' };

  let bytes;
  try {
    bytes = util.newBuffer(util.base64.length(payload));
    util.base64.decode(payload, bytes, 0);
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
  arrow: ({ style }) => ({ style: { ...style, fontSize: '0.9em' } }),
  arrowSign: { color: '#ffffff' },
  nestedNodeItemString: ({ style }) => ({ style: { ...style, color: '#ccd2dc' } }),
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
  const [copied, setCopied] = useState(false);

  const decoder = decoders.find((d) => d.label === decoderName) || null;
  const input = useMemo(() => parseInput(encodedText), [encodedText]);
  const result = useMemo(() => decode(input, decoder), [input, decoder]);
  const json = useMemo(() => (result.data ? JSON.stringify(result.data, null, 2) : ''), [result]);
  const ok = result.status === 'ok';
  const source = input.operation ? ` from ${input.operation} ${input.isResponse ? 'response' : 'request'}` : '';

  const selectDecoder = (name) => {
    setDecoderName(name);
    localStorage.setItem(STORAGE_KEY, name);
  };

  // Detect on input rather than on render, so a manual pick afterwards isn't overridden.
  const handleInput = (text) => {
    setEncodedText(text);
    const { typeName } = parseInput(text);
    if (typeName && decoders.some((d) => d.label === typeName)) selectDecoder(typeName);
  };

  const handleCopy = async () => {
    await copyText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const status = {
    empty: { tone: 'muted', text: 'Ready. Paste base64 or a SOAP envelope to decode it.' },
    idle: { tone: 'warn', text: `${result.size} bytes${source}. Choose a message type.` },
    error: { tone: 'error', text: result.message },
    ok: { tone: 'ok', text: `Decoded ${result.size} bytes${source} as ${decoder?.label}` },
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
            onChange={(event, option) => selectDecoder(option ? option.label : '')}
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

          <div className={`paste-field ${result.status === 'error' ? 'invalid' : ''}`}>
            <input
              className="paste-input"
              value={encodedText}
              onChange={(event) => handleInput(event.target.value)}
              onPaste={(event) => {
                event.preventDefault();
                handleInput(event.clipboardData.getData('text'));
              }}
              placeholder="Paste base64 or a SOAP envelope…"
              spellCheck={false}
              autoFocus
            />
            {encodedText && (
              <>
                {input.xml && <span className="paste-badge" title={input.operation}>xml</span>}
                <span className="paste-meta">{encodedText.length.toLocaleString()} chars</span>
                <button className="icon-btn" title="Clear" onClick={() => setEncodedText('')}>
                  <Icon name="clear" />
                </button>
              </>
            )}
          </div>
        </header>

        <main className="workspace">
          <section className="pane">
            <div className="pane-header">
              <span className="pane-label">Output</span>
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
              </div>
            </div>

            <div className="output">
              {result.status === 'empty' && <EmptyState title="Nothing to decode yet" hint="Paste a base64 payload or a whole SOAP envelope from the Network tab. With SOAP, the message type is picked for you." />}
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
          <span className="status-meta">api v{version} · {decoders.length} message types</span>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;

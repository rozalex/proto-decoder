// Extracts the SOAP operation → message type table from the proto api's WCF client,
// which only encodes it as code: X.encode(req) → sendHttpRequest(.., 'NFormOp') → decodeResponse(Y, ..).
const fs = require('fs');
const path = require('path');

const source = fs
  .readFileSync(require.resolve('@priority-software/priority-proto-api/lib/wcfclient'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '');

const operations = {};
for (const fn of source.split(/\nfunction /).slice(1)) {
  const operation = fn.match(/sendHttpRequest\([^,]+,\s*['"](\w+)['"]/)?.[1];
  if (!operation) continue;
  operations[operation] = {
    request: fn.match(/netitems\.\w+\.(\w+)\.encode\(/)?.[1] ?? null,
    response: fn.match(/decodeResponse\([\w.]*netitems\.\w+\.(\w+)/)?.[1] ?? null,
  };
}

const target = path.join(__dirname, '..', 'src', 'soapOperations.json');
fs.writeFileSync(target, JSON.stringify(operations, null, 2) + '\n');
console.log(`soapOperations.json: ${Object.keys(operations).length} operations`);

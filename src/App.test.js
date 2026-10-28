import { render, screen, fireEvent } from '@testing-library/react';
import { util } from 'protobufjs';
import { priority } from '@priority-software/priority-proto-api/lib/nform';
import soapOperations from './soapOperations.json';
import App from './App';

const { FormTreeRq, RecordColorsRq } = priority.netitems.form;

const encode = (Type, message) => {
  const bytes = Type.encode(Type.fromObject(message)).finish();
  return util.base64.encode(bytes, 0, bytes.length);
};

const RECORD_COLORS_RESPONSE =
  '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><s:Header><o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><u:Timestamp u:Id="_0"><u:Created>2026-10-28T17:37:41.940Z</u:Created><u:Expires>2026-10-28T17:42:41.940Z</u:Expires></u:Timestamp></o:Security></s:Header><s:Body><NFormRecordColorsResponse xmlns="http://tempuri.org/"><NFormRecordColorsResult>CgoNK4KkOx03t1M8GhQKB1NVUE5BTUUSByM1NzhiMmUwAQ==</NFormRecordColorsResult></NFormRecordColorsResponse></s:Body></s:Envelope>';

const soapRequest = (operation, payload) => `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header><Language xmlns="PriorityNS">3</Language></s:Header>
    <s:Body>
        <${operation} xmlns="http://tempuri.org/"><request>${payload}</request></${operation}></s:Body></s:Envelope>`;

const pasteField = () => screen.getByPlaceholderText(/paste base64/i);
const paste = (text) => fireEvent.change(pasteField(), { target: { value: text } });
const pickerValue = () => screen.getByPlaceholderText('Message type…').value;

beforeEach(() => localStorage.clear());

test('asks for a message type when none is selected', () => {
  render(<App />);
  paste(encode(FormTreeRq, { RootFormName: 'ORDERS' }));
  expect(screen.getByText(/choose a message type\./i)).toBeInTheDocument();
});

test('decodes the payload with the remembered message type', () => {
  localStorage.setItem('proto-decoder:type', 'FormTreeRq');
  render(<App />);
  paste(`"${encode(FormTreeRq, { RootFormName: 'ORDERS' })}"\n`);
  expect(screen.getByText(/decoded \d+ bytes as FormTreeRq/i)).toBeInTheDocument();
  expect(screen.getByText(/ORDERS/)).toBeInTheDocument();
});

test('pasting replaces whatever was in the input', () => {
  localStorage.setItem('proto-decoder:type', 'FormTreeRq');
  render(<App />);
  paste('leftover');
  const payload = encode(FormTreeRq, { RootFormName: 'ORDERS' });
  fireEvent.paste(pasteField(), { clipboardData: { getData: () => payload } });
  expect(pasteField()).toHaveValue(payload);
  expect(screen.getByText(/decoded \d+ bytes as FormTreeRq/i)).toBeInTheDocument();
});

test('reports invalid base64', () => {
  render(<App />);
  paste('not base64!');
  expect(screen.getAllByText(/not valid base64/i).length).toBeGreaterThan(0);
});

test('extracts the payload and response type from a SOAP response', () => {
  localStorage.setItem('proto-decoder:type', 'FormTreeRq');
  render(<App />);
  paste(RECORD_COLORS_RESPONSE);
  expect(pickerValue()).toBe('RecordColorsRs');
  expect(screen.getByText(/decoded \d+ bytes from NFormRecordColors response as RecordColorsRs/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'json' }));
  expect(screen.getByText('"SUPNAME"')).toBeInTheDocument();
});

test('extracts the payload and request type from a SOAP request', () => {
  render(<App />);
  paste(soapRequest('NFormRecordColors', encode(RecordColorsRq, { Fname: 'ORDERS' })));
  expect(pickerValue()).toBe('RecordColorsRq');
  expect(screen.getByText(/ORDERS/)).toBeInTheDocument();
});

test('reports SOAP faults instead of trying to decode them', () => {
  render(<App />);
  paste('<s:Envelope><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring xml:lang="en-US">Session expired</faultstring></s:Fault></s:Body></s:Envelope>');
  expect(screen.getAllByText(/SOAP fault: Session expired/).length).toBeGreaterThan(0);
});

test('maps operations whose types do not follow the naming convention', () => {
  expect(soapOperations.NFormSubform).toEqual({ request: 'SubformRq', response: 'StartRs' });
  expect(soapOperations.NGenWhoAmI).toEqual({ request: 'WhoAmIRq', response: 'WhoAmIRs' });
});

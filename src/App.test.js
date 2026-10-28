import { render, screen, fireEvent } from '@testing-library/react';
import { util } from 'protobufjs';
import { priority } from '@priority-software/priority-proto-api/lib/nform';
import App from './App';

const { FormTreeRq } = priority.netitems.form;

const encode = (message) => {
  const bytes = FormTreeRq.encode(FormTreeRq.fromObject(message)).finish();
  return util.base64.encode(bytes, 0, bytes.length);
};

const paste = (text) =>
  fireEvent.change(screen.getByPlaceholderText(/paste base64/i), { target: { value: text } });

beforeEach(() => localStorage.clear());

test('asks for a message type when none is selected', () => {
  render(<App />);
  paste(encode({ RootFormName: 'ORDERS' }));
  expect(screen.getByText(/choose a message type\./i)).toBeInTheDocument();
});

test('decodes the payload with the remembered message type', () => {
  localStorage.setItem('proto-decoder:type', 'FormTreeRq');
  render(<App />);
  paste(`"${encode({ RootFormName: 'ORDERS' })}"\n`);
  expect(screen.getByText(/decoded \d+ bytes as FormTreeRq/i)).toBeInTheDocument();
  expect(screen.getByText(/ORDERS/)).toBeInTheDocument();
});

test('reports invalid base64', () => {
  render(<App />);
  paste('not base64!');
  expect(screen.getAllByText(/not valid base64/i).length).toBeGreaterThan(0);
});

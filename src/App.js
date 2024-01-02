import React, { useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { util } from 'protobufjs';
import { JSONTree } from 'react-json-tree';
import { priority } from '@priority-software/priority-proto-api/lib/nform';

const form = priority.netitems.form;
const ngtw = priority.netitems.ngtw;

const filterOptions = Object.entries({ ...form, ...ngtw }).map(([key, value]) => ({
  label: key,
  decode: value.decode
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  components: {
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: '#fff',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: '#fff',
          borderColor: '#999',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#fff',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: '#333',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#666',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#888',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: '#333',
          color: '#fff',
        },
      },
    },
  },
});

function App() {
  const [encodedText, setEncodedText] = useState("");
  const [decoder, setDecoder] = useState("");
  const [alertState, setAlertState] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertType, setAlertType] = useState("");
  const [json, setJSON] = useState();
  const [isExpanded, setIsExpanded] = useState(false); // Track expansion state

  const decodeText = () => {
    try {
      const buf64 = util.newBuffer(util.base64.length(encodedText));
      util.base64.decode(encodedText, buf64, 0);
      const text = decoder.decode(buf64);
      console.log(text);

      setJSON(text);
      setAlertType("success");
      setAlertText("Decoded successfully");
    } catch (err) {
      setAlertType("error");
      setAlertText("Error decoding, make sure you have selected the correct decoder");
    }

    setAlertState(true);
  };

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className={`App ${isExpanded ? "expanded" : ""}`}>
        <main className="App-content">
          {!isExpanded && (
            <div className="input-section">
              <div className="input-group">
                <Autocomplete
                  disablePortal
                  onChange={(event, value) => { setDecoder(value) }}
                  options={filterOptions}
                  sx={{ width: "50%" }} // Set the width of the Autocomplete component
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Decoder"
                      variant="outlined"
                    />
                  )}
                />
                <Button
                  variant="contained"
                  onClick={decodeText}
                  disabled={!decoder}
                >
                  Decode
                </Button>
              </div>

              <TextareaAutosize
                className="textarea"
                onChange={ev => setEncodedText(ev.target.value)}
                value={encodedText}
                placeholder="Enter encoded text..."
              />
            </div>
          )}

          <div className={`result-section ${isExpanded ? "expanded" : ""}`}>
            <div className={`result ${isExpanded ? "expanded" : ""}`}>
              <Button onClick={toggleExpansion}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
              <pre id="preelement" >
                {JSON.stringify(json, null, 2)}
              </pre>
            </div>

            <div className="tree">
              {json && <JSONTree data={json} />}
            </div>

            <Snackbar
              open={alertState}
              autoHideDuration={3000}
              onClose={() => { setAlertState(false) }}
            >
              <Alert severity={alertType}>{alertText}</Alert>
            </Snackbar>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
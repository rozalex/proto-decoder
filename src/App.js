import React, { useState } from 'react';
import './App.css';

import { util } from 'protobufjs';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import {priority} from '@prioritysoftware/priority-proto-api/lib/nform';

const filterOptions = [];
const form = priority.netitems.form;

for (let key in form) {
  filterOptions.push({"label": key, "decode": form[key].decode})
}

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function App() {
  const [encodedText, setEncodedText] = useState("");
  const [decoder, setDecoder] = useState("");
  const [alertState, setAlertState] = useState(false);
  const [alertText, setAlertText] = useState(false);
  const [alertType, setAlertType] = useState(false);

  const decodeText = () => {
    try {
      let buf64 = util.newBuffer(util.base64.length(encodedText));
      util.base64.decode(encodedText, buf64, 0);
      const text = decoder.decode(buf64);
      console.log(text);

      setAlertType("success");
      setAlertText("Decoded successfully, check console for result");
    } catch(err) {
      setAlertType("error");
      setAlertText("Error decoding, make sure you have selected a correct decoder");
    }

    setAlertState(true);
  }
    
  return (
    <div className="App">
        <Autocomplete
          disablePortal
          onChange={(event, value) => {setDecoder(value)}}
          options={filterOptions}
          sx={{ width: "50vw" }}
          renderInput={(params) => <TextField {...params} label="Decoder" />}
        />
        <TextareaAutosize
          onChange={ev => setEncodedText(ev.target.value)}
          value={encodedText}
          style={{ width: "50vw", height: "50vh", marginTop: 5 }}
        />
      <Button width={"10vw"} variant="contained" onClick={decodeText}>Decode</Button>
      <div className="alert">
        <Snackbar open={alertState} autoHideDuration={4000} onClose={() => {setAlertState(false)}}>
          <Alert severity={alertType}>{alertText}</Alert>
        </Snackbar>
      </div>
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import './App.css';

import { util } from 'protobufjs';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import {priority} from '@prioritysoftware/priority-proto-api/lib/nform';

const filterOptions = [];
const form = priority.netitems.form;

for (let key in form) {
  filterOptions.push({"label": key, "decode": form[key].decode})
}

function App() {
  const [encodedText, setEncodedText] = useState("");
  const [decoder, setDecoder] = useState("");

  const decodeText = () => {
    let buf64 = util.newBuffer(util.base64.length(encodedText));
    util.base64.decode(encodedText, buf64, 0);
    const text = decoder.decode(buf64);
    console.log(text);
  }

  return (
    <div className="App">
        <Autocomplete
          disablePortal
          onChange={(event, value) => {setDecoder(value)}}
          options={filterOptions}
          sx={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Service" />}
        />
        <TextareaAutosize
          onChange={ev => setEncodedText(ev.target.value)}
          value={encodedText}
          style={{ width: 600, height: 300, marginTop: 5 }}
        />
      <Button width={"100px"} variant="contained" onClick={decodeText}>Decode</Button>
    </div>
  );
}

export default App;

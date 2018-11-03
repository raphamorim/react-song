import React from 'react';
import { Song, Midi } from '../src/index';

const base64 = document.querySelector('#bhc').value;

class BeverlyHillsCop extends React.Component {
  render() {
    return (
      <Song>
        <Midi base64={base64} />
      </Song>
    );
  }
}

export default BeverlyHillsCop;

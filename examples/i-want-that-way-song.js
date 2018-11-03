import React from 'react';
import { Song, Midi } from '../src/index';

const base64 = document.querySelector('#bsb').value;

class IWantThatWay extends React.Component {
  render() {
    return (
      <Song>
        <Midi base64={base64} />
      </Song>
    );
  }
}

export default IWantThatWay;

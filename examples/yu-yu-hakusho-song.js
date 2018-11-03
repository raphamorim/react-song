import React from 'react';
import { Song, Midi } from '../src/index';

// GH-Pages Cache
const base64 = document.querySelector('#yyh').value;

class YuYuHakushoSong extends React.Component {
  render() {
    return (
      <Song>
        <Midi base64={base64} />
      </Song>
    );
  }
}

export default YuYuHakushoSong;

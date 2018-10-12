import React from 'react';
import { Song, Note, Track, render } from './src/index';

class Music extends React.Component {
  render() {
    return (
      // bpm = beats per minute
      // metronome =
      <Song bpm={60} metronome={60}/>
    );
  }
}

render(<Music/>, document.querySelector('#root'));

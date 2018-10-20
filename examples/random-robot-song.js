import React from 'react';
import { Song, Note } from '../src/index';

const getRandomInt = (max) => Math.floor(Math.random() * Math.floor(max));

let notes = [];
for (let i = 0; i <= 10000; i += 200) {
  notes.push(
    <Note
      key={i}
      ticks={i}
      number={getRandomInt(120)}
      duration={30}
      velocity={60}
    />
  );
}

class Music extends React.Component {
  render() {
    return (
      <Song bpm={100} metronome={100}>
        { notes }
      </Song>
    );
  }
}

export default Music;

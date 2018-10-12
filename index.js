import React from 'react';
import { Song, Note, Track, render } from './src/index';

const Music = () => (
  <Song bpm={60} metronome={60}>
    <Note number={30} velocity={100} duration={192}/>
    <Note number={33} velocity={100} duration={192}/>
    <Note number={33} velocity={100} duration={192}/>
    <Note number={33} velocity={100} duration={192}/>
    <Note number={34} velocity={100} duration={192}/>
  </Song>
)

console.log(1)

render(Music, document.querySelector('#root'));

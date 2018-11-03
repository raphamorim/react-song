import React from 'react';
import { render } from './src/index';
import RandomRobotSong from './examples/random-robot-song';
import BeverlyHillsCopSong from './examples/beverly-hills-cop-song';
import IWantThatWaySong from './examples/i-want-that-way-song';
import YuYuHakushoSong from './examples/yu-yu-hakusho-song';

import './examples/utils/visualizer';

let App;
let urlParams = new URLSearchParams(window.location.search);
let experiment = urlParams.get('s');

switch (experiment) {
  case 'yuyuhakusho':
    App = YuYuHakushoSong;
    break;
  case 'beverlyhillscop':
    App = BeverlyHillsCopSong;
    break;
  case 'backstreetboys':
    App = IWantThatWaySong;
    break;
  case 'robot':
    App = RandomRobotSong;
  default:
    App = IWantThatWaySong;
}

render(<App/>, document.querySelector('#root'));

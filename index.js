import React from 'react';
import { render } from './src/index';
import RandomRobotSong from './examples/random-robot-song';
import BeverlyHillsCopSong from './examples/beverly-hills-cop-song';
import IWantThatWaySong from './examples/i-want-that-way-song';
import YuYuHakushoSong from './examples/yu-yu-hakusho-song';

import './examples/utils/visualizer';

let App;

switch (window.location.pathname) {
  case '/yyh':
    App = YuYuHakushoSong;
    break;
  case '/bhc':
    App = BeverlyHillsCopSong;
    break;
  case '/bsb':
    App = IWantThatWaySong;
    break;
  default:
    App = RandomRobotSong;
}

render(<App/>, document.querySelector('#root'));

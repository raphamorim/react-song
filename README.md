# React Song

```jsx
import React, { render } from 'react';
import { Song, Note, Track } from 'react-song';

<Song bpm={60} metronome={60}>
  <Note number={30} velocity={100} duration={192}/>
  <Note number={33} velocity={100} duration={192}/>
  <Note number={33} velocity={100} duration={192}/>
  <Note number={33} velocity={100} duration={192}/>
  <Note number={34} velocity={100} duration={192}/>
</Song>
```

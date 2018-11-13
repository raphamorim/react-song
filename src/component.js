/**
 * Copyright (c) 2018-present, Raphael Amorim.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import '../heartbeat/index.js';
import MaestroModule from './maestro';

let Maestro, createMidiFile;

Maestro = window.sequencer;
// createMidiFile = window.sequencer.createMidiFile;

// Maestro = MaestroModule;
createMidiFile = MaestroModule.createMidi;

class Song {
  constructor(props) {
    this.notes = [];
    this.midi = null;
    this.config = {
      metronome: props.metronome || true,
      bpm: props.bpm || 60,
      bars: props.bars || 4,
    }
  }

  setMIDI(midi) {
    this.midi = midi;
  }

  addSequence(sequence) {
    this.notes = this.notes.concat(sequence);
  }

  render() {
    let { notes, midi, config } = this;
    const { metronome, bpm, bars } = config;

    if (midi) {
      return midi().then(
        function onFulfilled(midifile){
          const song = Maestro.createSong(midifile);
          const event = new CustomEvent('songCreated', {
            bubbles: true,
            detail: song
          });
          window.document.body.dispatchEvent(event);
          song.play();
        },
        function onRejected(e){
          console.warn(e);
        }
      );
    }

    const song = Maestro.createSong({
      bars: bars,
      bpm: bpm,
      events: notes,
      useMetronome: metronome
    });
    window.reactSong = song;
    const event = new CustomEvent('songCreated', {
      bubbles: true,
      detail: song
    });
    window.document.body.dispatchEvent(event);
    song.play();
  }
}

function createSequence(props) {
  const { ticks, number, duration, velocity, panning } = props;

  const note = Maestro.createMidiEvent(
    ticks,
    SongModule.NOTE_ON,
    number || 0,
    velocity || 0
  );

  const noteOff = Maestro.createMidiEvent(
    ticks + duration,
    SongModule.NOTE_OFF,
    number || 0,
    0
  );

  return { type: 'notes', notes: [note, noteOff] };
}

function createMidi(props) {
  const { base64 } = props;
  if (base64) {
    const midi = createMidiFile.bind(this, { base64 });
    return { type: 'midi', midi };
  }
}

export function createElement(type, props) {
  const COMPONENTS = {
    Song: () => new Song(props),
    Note: () => createSequence(props),
    Midi: () => createMidi(props)
  };

  return COMPONENTS[type]
    ? COMPONENTS[type]()
    : console.error(type + " ins't a valid element type");
}

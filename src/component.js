import '../heartbeat/index.js';

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
          const song = window.sequencer.createSong(midifile);
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

    const song = window.sequencer.createSong({
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

  const note = sequencer.createMidiEvent(
    ticks,
    window.sequencer.NOTE_ON,
    number || 0,
    velocity || 0
  );

  const noteOff = sequencer.createMidiEvent(
    ticks + duration,
    window.sequencer.NOTE_OFF,
    number || 0,
    0
  );

  return { type: 'notes', notes: [note, noteOff] };
}

function createMidi(props) {
  const { base64 } = props;
  const { createMidiFile } = window.sequencer;
  if (base64) {
    return { type: 'midi', midi: createMidiFile.bind(this, { base64 }) };
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

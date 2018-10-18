import '../heartbeat/index.js';

class Song {
  constructor(props) {
    this.notes = [];
    this.config = {
      metronome: props.metronome || true,
      bpm: props.bpm || 60,
      bars: props.bars || 4,
    }
  }

  addSequence(sequence) {
    this.notes = this.notes.concat(sequence);
  }

  render() {
    let { notes, config } = this;
    const { metronome, bpm, bars } = config;

    // const controlChange = window.sequencer.createMidiEvent(0, sequencer.CONTROL_CHANGE, 10, 0);
    // notes = notes.unshift(controlChange);

    console.log(notes);

    const song = window.sequencer.createSong({
      bars: bars,
      bpm: bpm,
      events: notes,
      useMetronome: metronome
    });

    window.reactSong = song;

    // song.play();
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

  return [note, noteOff];
}

export function createElement(type, props) {
  const COMPONENTS = {
    Song: () => new Song(props),
    Note: () => createSequence(props)
  };

  return COMPONENTS[type]
    ? COMPONENTS[type]()
    : console.error(type + " ins't a valid element type");
}

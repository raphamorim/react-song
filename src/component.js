import './heartbeat';

class Song {
  constructor(props) {
    this.notes = [];
    this.config = {
      metronome: props.metronome || true,
      bpm: props.bpm || 60,
    }

    console.log('song mounted');
  }

  addNote(note) {
    this.notes.push(note);
  }

  render() {
    window.sequencer.ready(() => {
      const { notes, config } = this;
      const { metronome, bpm } = config;
      var ticks = 0;
      var noteDuration = 120;
      var numEvents = 12;
      var velocity = 60;
      var midiEvent = sequencer.createMidiEvent(ticks, sequencer.CONTROL_CHANGE, 10, 0);
      notes.push(midiEvent);

      // then gradually change panning to full right (127)
      for(var i = 0; i < numEvents; i++){
          var noteNumber = i % 2 === 0 ? 30 : 72;
          midiEvent = sequencer.createMidiEvent(ticks, sequencer.NOTE_ON, noteNumber, velocity);
          notes.push(midiEvent);
          ticks += noteDuration;

          ticks += noteDuration;
          midiEvent = sequencer.createMidiEvent(ticks, sequencer.NOTE_OFF, noteNumber, 0);
          notes.push(midiEvent);
      }

      const song = window.sequencer.createSong({
        bpm: bpm,
        events: notes,
        useMetronome: metronome
      });

      console.log('song rendered');

      song.play();
    });
  }
}

class Note {
  constructor(props) {

  }
}

export function createElement(type, props) {
  const COMPONENTS = {
    Song: () => new Song(props),
    Note: () => new Note(props)
  };

  return COMPONENTS[type]
    ? COMPONENTS[type]()
    : console.warn(
        type + " ins’t a valid element type"
      );
}

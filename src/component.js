class Song {
  constructor(props) {
    this.note = [];
  }

  addNote(note) {
    this.songs.push(note);
  }

  render() {

  }
}

class Note {
  constructor(props) {
    // sequencer.createSong({
    //   bpm: bpm,
    //   events: events,
    //   useMetronome: true
    // })
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

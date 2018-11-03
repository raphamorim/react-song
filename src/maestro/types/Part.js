class Part {
  addEvents() {
    const args = getEventsAndConfig(arguments, this);
    addEvents(args, this, false);
  }

  addEventsRelative() {
    const args = getEventsAndConfig(arguments, this);
    addEvents(args, this, true);
  }

  removeEvent() {
    this.removeEvents(arguments);
  }

  removeEvents() {
    const args = getEventsAndConfig(arguments, this);
    if (args === false) {
      return false;
    }
    return removeEvents(args.events, this);
  }

  moveEvent() {
    this.moveEvents(arguments);
  }

  moveEvents() {
    const args = getEventsAndConfig(arguments, this);
    moveEvents(args, this);
  }

  moveAllEvents(ticks) {
    moveEvents({
      events: this.events,
      config: [ticks]
    }, this);
  }

  moveNote(note, ticks) {
    moveEvents({
      events: [note.noteOn, note.noteOff],
      config: [ticks]
    }, this);
  }

  transposeEvents() {
    const args = getEventsAndConfig(arguments, this);
    transposeEvents(args, this);
  }

  transposeAllEvents(semi) {
    transposeEvents({
      events: this.events,
      config: [semi]
    }, this);
  }

  transposeNote(note, semi) {
    transposeEvents({
      events: [note.noteOn, note.noteOff],
      config: [semi]
    }, this);
  }

  reverseByTicks(duration) {
    if (this.needsUpdate) {
      this.update();
    }
    reverseByTicks(this, duration);
  }

  reverseByPitch() {
    if (this.needsUpdate) {
      this.update();
    }
    reverseByPitch(this);
  }

  findEvents(pattern) {
    return findEvent(this, pattern);
  }

  findNotes(pattern) {
    return this.findNote(this, pattern);
  }

  getStats(pattern) {
    return getStats(this, pattern);
  }

  getIndex() {
    var parts, part, i;

    if (this.track) {
      parts = this.track.parts;

      for (i = this.track.numParts - 1; i >= 0; i--) {
        part = parts[i];
        if (part.id === this.id) {
          return i;
        }
      }
    }
    return -1;
  };


  copy() {
    var part = new Part(copyName(this.name)),
      partTicks = this.ticks,
      eventsById = this.eventsById,
      copies = [],
      copy, id, event;
    //console.log('Part.copy', events);

    part.song = undefined;
    part.track = undefined;
    part.trackId = undefined;

    for (id in eventsById) {
      if (eventsById.hasOwnProperty(id)) {
        event = eventsById[id];
        copy = event.copy();
        //console.log(copy.ticks, partTicks);
        copy.ticks = copy.ticks - partTicks;
        copies.push(copy);
      }
    }
    part.addEvents(copies);
    return part;
  };

  setSolo(flag) {
    if (flag === undefined) {
      flag = !this.solo;
    }
    this.mute = false;
    this.solo = flag;
    // stop all sounds here
    this.allNotesOff();
    if (this.track) {
      this.track.setPartSolo(this, flag);
    }
    //console.log(this.solo, this.mute);
  };


  allNotesOff() {
    if (this.track === undefined) {
      return;
    }
    this.track.instrument.allNotesOffPart(this.id);
  };


  // called by Track if a part gets removed from a track
  reset(fromTrack, fromSong) {
    var eventsById = this.eventsById,
      id, event;

    if (fromSong) {
      this.song = undefined;
    }
    if (fromTrack) {
      this.track = undefined;
    }
    this.trackId = undefined;
    this.start.millis = undefined;
    this.end.millis = undefined;

    for (id in eventsById) {
      if (eventsById.hasOwnProperty(id)) {
        event = eventsById[id];
        event.ticks -= this.ticks;
        event.reset(false, fromTrack, fromSong);
        //event.state = 'removed';
      }
    }
    this.ticks = 0;
    this.needsUpdate = true;
  };


  update() {
    //console.log('part update');

    var i, maxi, j, maxj, id, event, noteNumber, note, onEvents, onEvent,
      firstEvent, lastEvent, stats,
      noteOnEvents = [],
      notes = [],
      numNotes = 0,
      part = this,
      partId = this.id,
      track = this.track,
      trackId = this.track ? this.track.id : undefined;

    // if(!trackId){
    //     console.log(this, 'does not belong to a track anymore');
    // }

    //console.log('Part.update()', this.state, this.eventsById);

    this.events = [];

    for (id in this.eventsById) {
      if (this.eventsById.hasOwnProperty(id)) {
        event = this.eventsById[id];
        //console.log(event);
        if (event.state !== 'clean') {
          //console.log(event.state);
          this.dirtyEvents[event.id] = event;
        }

        if (event.state !== 'removed') {
          this.events.push(event);
        }
      }
    }

    this.events.sort(function(a, b) {
      return a.sortIndex - b.sortIndex;
    });


    for (i = 0, maxi = this.notes.length; i < maxi; i++) {
      note = this.notes[i];
      //console.log(note.noteOn.state);
      if (note.noteOn.state === 'removed' || (note.noteOff !== undefined && note.noteOff.state === 'removed')) {
        note.state = 'removed';
        this.dirtyNotes[note.id] = note;
        delete this.notesById[note.id];
      } else if (note.noteOn.state === 'changed' || (note.noteOff !== undefined && note.noteOff.state === 'changed')) {
        note.state = 'changed';
        this.dirtyNotes[note.id] = note;
      }
    }

    //console.log('part', this.events.length);

    for (i = 0, maxi = this.events.length; i < maxi; i++) {
      event = this.events[i];
      noteNumber = event.noteNumber;

      if (event.type === sequencer.NOTE_ON) {
        if (event.midiNote === undefined) {

          /*
          if(noteOnEvents[noteNumber] === undefined){
              noteOnEvents[noteNumber] = [];
          }
          noteOnEvents[noteNumber].push(event);
          */


          //console.log(i, 'NOTE_ON', event.eventNumber, noteNumber, noteOnEvents[noteNumber]);
          note = createMidiNote(event);
          note.part = part;
          note.partId = partId;
          note.track = track;
          note.trackId = trackId;
          note.state = 'new';
          this.notesById[note.id] = note;
          this.dirtyNotes[note.id] = note;
          if (notes[noteNumber] === undefined) {
            notes[noteNumber] = [];
          }
          notes[noteNumber].push(note);
          //console.log('create note:', note.id, 'for:', noteNumber, 'ticks:', event.ticks);
        }
      } else if (event.type === sequencer.NOTE_OFF) {
        //console.log(event.midiNote);
        if (event.midiNote === undefined) {
          if (notes[noteNumber] === undefined) {
            //console.log('no note!', noteNumber);
            continue;
          }

          var l = notes[noteNumber].length - 1;
          note = notes[noteNumber][l];
          if (note.noteOff !== undefined && note.durationTicks > 0) {
            //console.log('has already a note off event!', noteNumber, note.durationTicks, note.noteOff.ticks, event.ticks);
            continue;
          }
          /*
                              // get the lastly added note
                              var l = notes[noteNumber].length - 1;
                              var t = 0;
                              note = null;

                              while(t <= l){
                                  note = notes[noteNumber][t];
                                  if(note.noteOff === undefined){
                                      break;
                                  }
                                  t++
                              }
          */
          if (note === null) {
            continue;
          }

          //console.log('add note off to note:', note.id, 'for:', noteNumber, 'ticks:', event.ticks, 'num note on:', l, 'index:', t);
          if (note.noteOn === undefined) {
            //console.log('no NOTE ON');
            continue;
          }
          if (note.state !== 'new') {
            note.state = 'changed';
          }
          this.dirtyNotes[note.id] = note;
          note.addNoteOff(event);


          /*
          onEvents = noteOnEvents[noteNumber];
          if(onEvents){
              onEvent = onEvents.shift();
              //console.log(note.midiNote);
              if(onEvent && onEvent.midiNote){
                  note = onEvent.midiNote;
                  if(note.state !== 'new'){
                      note.state = 'changed';
                  }
                  this.dirtyNotes[note.id] = note;
                  if(event.ticks - note.noteOn.ticks === 0){
                      console.log(note.noteOn.ticks, event.ticks);
                      note.adjusted = true;
                      //event.ticks += 120;
                  }
                  note.addNoteOff(event);
                  //console.log(i, 'NOTE_OFF', event.midiNote);
              }
          }else{
              maxj = this.notes.length;
              for(j = maxj - 1; j >= 0; j--){
                  note = this.notes[j];
                  if(note.number === event.noteNumber){
                      note.state = 'changed';
                      note.addNoteOff(event);
                      this.dirtyNotes[note.id] = note;
                      //console.log(note.id);
                      break;
                  }
              }
          }
          */

        } else if (this.notesById[event.midiNote.id] === undefined) {
          //console.log('not here');
          // note is recorded and has already a duration
          note = event.midiNote;
          //console.log('recorded notes', note.id);
          //note.state = 'new';
          note.part = part;
          note.partId = partId;
          note.track = track;
          note.trackId = trackId;
          //this.dirtyNotes[note.id] = note;
          this.notesById[note.id] = note;
        } else {
          //console.log('certainly not here');
        }
      }
    }

    this.notes = [];
    notes = null;
    for (id in this.notesById) {
      if (this.notesById.hasOwnProperty(id)) {
        note = this.notesById[id];
        this.notes.push(note);
      }
    }

    this.notes.sort(function(a, b) {
      return a.ticks - b.ticks;
    });

    this.numEvents = this.events.length;
    this.numNotes = this.notes.length;

    //console.log(this.numEvents, this.numNotes);

    firstEvent = this.events[0];
    lastEvent = this.events[this.numEvents - 1];

    //console.log(firstEvent.ticks, lastEvent.ticks);

    if (firstEvent) {
      if (firstEvent.ticks < this.ticks) {
        this.autoSize = 'both';
      }

      switch (this.autoSize) {
        case 'right':
          this.start.ticks = this.ticks;
          this.end.ticks = lastEvent.ticks;
          this.duration.ticks = lastEvent.ticks - this.start.ticks;
          break;
        case 'both':
          this.start.ticks = firstEvent.ticks;
          this.end.ticks = lastEvent.ticks;
          this.duration.ticks = lastEvent.ticks - firstEvent.ticks;
          break;
      }
    } else {
      // fixing issue #6
      this.start.ticks = this.ticks;
      this.end.ticks = this.ticks + 100; // give the part a minimal duration of 100 ticks
      this.duration.ticks = 100;
    }

    stats = this.getStats('noteNumber all');
    this.lowestNote = stats.min;
    this.highestNote = stats.max;

    this.ticks = this.start.ticks;

    if (this.state === 'clean') {
      //@TODO: check if this is the preferred way of doing it after all, add: part.track.needsUpdate = true;
      //console.log('part sets its own status in update() -> this shouldn\'t happen');
      this.state = 'changed';
    }

    this.needsUpdate = false;
  }
}

export default Part;

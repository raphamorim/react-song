// sequencer.createSong
// sequencer.createSong
// sequencer.createMidiEvent
// sequencer.NOTE_ON
// sequencer.createMidiEvent
// sequencer.NOTE_OFF

let Song = Function;

Song.prototype.play = function() {
  sequencer.unlockWebAudio();
  var song, playstart;

  //console.log(this.playing);
  if (this.playing) {
    this.pause();
    return;
  }
  // tell the scheduler to schedule the audio events that start before the current position of the playhead
  this.scheduler.firstRun = true;

  // only loop when the loop is legal and this.loop is set to true
  this.doLoop = (this.illegalLoop === false && this.loop === true);
  //console.log('play', this.doLoop, this.illegalLoop, this.loop);
  // or should I move to loopStart here if loop is enabled?
  if (this.endOfSong) {
    this.followEvent.resetAllListeners();
    this.playhead.set('millis', 0);
    this.scheduler.setIndex(0);
  }
  // timeStamp is used for calculating the diff in time of every consecutive frame
  this.timeStamp = sequencer.getTime() * 1000;
  this.startTime = this.timeStamp;
  try {
    this.startTime2 = window.performance.now();
    //this.startTime2 = undefined;
  } catch (e) {
    if (sequencer.debug) {
      console.log('window.performance.now() not supported');
    }
  }

  if (this.precounting) {
    this.metronome.startTime = this.startTime;
    this.metronome.startTime2 = this.startTime2;
    this.startTime += this.metronome.precountDurationInMillis;
    this.startTime2 += this.metronome.precountDurationInMillis;

    //console.log(this.metronome.startTime, this.recordTimestamp);

    song = this;
    playstart = this.startTime / 1000;

    //console.log(this.startTime, playstart, this.recordTimestamp/1000 - playstart);

    repetitiveTasks.playAfterPrecount = function() {
      if (sequencer.getTime() >= playstart) {
        song.precounting = false;
        song.prerolling = false;
        song.recording = true;
        song.playing = true;
        dispatchEvent(song, 'record_start');
        dispatchEvent(song, 'play');
        //console.log('playAfterPrecount', sequencer.getTime(), playstart, song.metronome.precountDurationInMillis);
        repetitiveTasks.playAfterPrecount = undefined;
        delete repetitiveTasks.playAfterPrecount;
      }
    };
  }
  // this value will be deducted from the millis value of the event as soon as the event get scheduled
  this.startMillis = this.millis;
  //console.log(this.startMillis);

  // make first call right after setting a time stamp to avoid delay
  //pulse(this);

  song = this;

  // fixes bug: when an event listener is added to a midi note, the listener sometimes misses the first note
  song.playhead.update('millis', 0);
  song.followEvent.update();

  repetitiveTasks[this.id] = function() {
    pulse(song);
  };

  this.paused = false;
  this.stopped = false;
  this.endOfSong = false;
  if (this.precounting !== true) {
    this.playing = true;
    dispatchEvent(this, 'play');
  }
};


Song.prototype.pause = function() {
  if (this.recording === true || this.precounting === true) {
    this.stop();
    return;
  }
  if (this.stopped || this.paused) {
    this.play();
    return;
  }
  delete repetitiveTasks[this.id];
  this.allNotesOff();
  this.playing = false;
  this.paused = true;
  dispatchEvent(this, 'pause');
};


Song.prototype.stop = function() {
  if (this.stopped) {
    // is this necessary?
    this.followEvent.resetAllListeners();
    this.playhead.set('millis', 0);
    this.scheduler.setIndex(0);
    return;
  }
  if (this.recording === true || this.precounting === true) {
    this.stopRecording();
  }
  delete repetitiveTasks[this.id];
  // remove unschedule callback of all samples
  objectForEach(timedTasks, function(task, id) {
    //console.log(id);
    if (id.indexOf('unschedule_') === 0 || id.indexOf('event_') === 0) {
      task = null;
      delete timedTasks[id];
    }
  });
  this.allNotesOff();

  this.playing = false;
  this.paused = false;
  this.stopped = true;
  this.endOfSong = false;

  this.followEvent.resetAllListeners();
  this.playhead.set('millis', 0);
  this.scheduler.setIndex(0);
  dispatchEvent(this, 'stop');
};


Song.prototype.adjustLatencyForAllRecordings = function(value) {
  // @todo: add callback here!
  this.audioRecordingLatency = value;
  this.tracks.forEach(function(track) {
    track.setAudioRecordingLatency(value);
  });
};


Song.prototype.setAudioRecordingLatency = function(recordId, value, callback) {
  var i, event, sampleId;

  for (i = this.audioEvents.length - 1; i >= 0; i--) {
    event = this.audioEvents[i];
    sampleId = event.sampleId;
    if (sampleId === undefined) {
      continue;
    }
    if (recordId === sampleId) {
      break;
    }
  }
  //console.log(recordId, value, callback);
  event.track.setAudioRecordingLatency(recordId, value, callback);
};


Song.prototype.startRecording = Song.prototype.record = function(precount) {
  //console.log(this.recording, this.precounting, precount);
  if (this.recording === true || this.precounting === true) {
    this.stop();
    return;
  }

  var userFeedback = false,
    audioRecording = false,
    i, track, self = this;

  this.metronome.precountDurationInMillis = 0;

  // allow to start a recording while playing
  if (this.playing) {
    this.precount = 0;
    this.recordStartMillis = this.millis;
  } else {
    if (precount === undefined) {
      this.precount = 0;
      this.recordStartMillis = this.millis;
    } else {
      // a recording with a precount always starts at the beginning of a bar
      this.setPlayhead('barsbeats', this.bar);
      this.metronome.createPrecountEvents(precount);
      this.precount = precount;
      this.recordStartMillis = this.millis - this.metronome.precountDurationInMillis;
      //console.log(this.metronome.precountDurationInMillis);
    }
    /*
                if(this.preroll === true){
                    // TODO: improve this -> leave it, preroll is always on unless the user sets it to false
                    //this.preroll = (this.bar - this.precount) > 0;
                }
    */
  }
  //console.log('preroll', this.preroll);
  //console.log('precount', this.precount);
  //console.log('precountDurationInMillis', this.metronome.precountDurationInMillis);
  //console.log('recordStartMillis', this.recordStartMillis);


  this.recordTimestampTicks = this.ticks;
  this.recordId = 'REC' + new Date().getTime();
  this.recordedNotes = [];
  this.recordedEvents = [];
  this.recordingNotes = {};
  this.recordingAudio = false;

  if (this.keyEditor !== undefined) {
    this.keyEditor.prepareForRecording(this.recordId);
  }

  for (i = this.numTracks - 1; i >= 0; i--) {
    track = this.tracks[i];
    if (track.recordEnabled === 'audio') {
      this.recordingAudio = true;
    }
    //console.log(track.name, track.index);
    if (track.recordEnabled === 'audio') {
      audioRecording = true;
      track.prepareForRecording(this.recordId, function() {
        if (userFeedback === false) {
          userFeedback = true;
          setRecordingStatus.call(self);
        }
      });
    } else {
      track.prepareForRecording(this.recordId);
    }
  }

  if (audioRecording === false) {
    setRecordingStatus.call(this);
  }

  return this.recordId;
};


var setRecordingStatus = function() {

  this.recordTimestamp = context.currentTime * 1000; // millis

  if (this.playing === false) {
    if (this.precount > 0) {
      // recording with precount always starts at the beginning of a bar
      //this.setPlayhead('barsbeats', this.bar);
      this.precounting = true;
      this.prerolling = this.preroll;
      if (this.prerolling) {
        dispatchEvent(this, 'record_preroll');
      } else {
        dispatchEvent(this, 'record_precount');
      }
    } else {
      this.recording = true;
      dispatchEvent(this, 'record_start');
    }
    this.play();
  } else {
    this.recording = true;
    this.precounting = false;
    dispatchEvent(this, 'record_start');
  }
};


var _getRecordingPerTrack = function(index, recordingHistory, callback) {
  var track, scope = this;

  if (index < this.numTracks) {
    track = this.tracks[index];
    track.stopRecording(this.recordId, function(events) {
      if (events !== undefined) {
        recordingHistory[track.name] = events;
      }
      index++;
      _getRecordingPerTrack.call(scope, index, recordingHistory, callback);
    });
  } else {
    callback(recordingHistory);
  }
};


Song.prototype.stopRecording = function() {
  if (this.recording === false) {
    return;
  }
  this.recording = false;
  this.prerolling = false;
  this.precounting = false;

  //repetitiveTasks.playAfterPrecount = undefined;
  delete repetitiveTasks.playAfterPrecount;
  var scope = this;

  _getRecordingPerTrack.call(this, 0, {}, function(history) {
    scope.update();
    dispatchEvent(scope, 'recorded_events', history);
  });

  // perform update immediately for midi recordings
  this.update();

  dispatchEvent(this, 'record_stop');

  return this.recordId;
};


Song.prototype.undoRecording = function(history) {
  var i, tracksByName;

  if (history === undefined) {
    for (i = this.numTracks - 1; i >= 0; i--) {
      this.tracks[i].undoRecording(this.recordId);
    }
  } else {
    tracksByName = this.tracksByName;
    objectForEach(history, function(events, name) {
      var track = tracksByName[name];
      track.undoRecording(events);
    });
  }
  //this.update();
};


Song.prototype.getAudioRecordingData = function(recordId) {
  var i, event, sampleId;

  for (i = this.audioEvents.length - 1; i >= 0; i--) {
    event = this.audioEvents[i];
    sampleId = event.sampleId;
    if (sampleId === undefined) {
      continue;
    }
    if (recordId === sampleId) {
      break;
    }
  }
  if (event === undefined) {
    return false;
  }
  return event.track.getAudioRecordingData(recordId);
};


// non-mandatory arguments: quantize value, history object
Song.prototype.quantize = function() {
  var i, track, arg, type,
    args = slice.call(arguments),
    numArgs = args.length,
    value,
    historyObject = {};

  //console.log(arguments);

  for (i = 0; i < numArgs; i++) {
    arg = args[i];
    type = typeString(arg);
    //console.log(arg, type);
    if (type === 'string' || type === 'number') {
      // overrule the quantize values of all tracks in this song, but the song's quantizeValue doesn't change
      value = arg;
    } else if (type === 'object') {
      historyObject = arg;
    }
  }

  //console.log(value, historyObject)
  for (i = this.numTracks - 1; i >= 0; i--) {
    track = this.tracks[i];
    // if no value is specified, use the value of the track
    if (value === undefined) {
      value = track.quantizeValue;
    }
    sequencer.quantize(track.events, value, this.ppq, historyObject);
  }

  return historyObject;
  //this.update();
};


Song.prototype.undoQuantize = function(history) {
  if (history === undefined) {
    if (sequencer.debug >= 2) {
      console.warn('please pass a quantize history object');
    }
    return;
  }

  var i, track;
  for (i = this.numTracks - 1; i >= 0; i--) {
    track = this.tracks[i];
    track.undoQuantize(history);
  }
};


Song.prototype.quantizeRecording = function(value) {
  var i, track;
  for (i = this.numTracks - 1; i >= 0; i--) {
    track = this.tracks[i];
    if (track.recordId === this.recordId) {
      track.quantizeRecording(value);
    }
  }
  //this.update();
};


// left: song position >= left locator
Song.prototype.setLeftLocator = function() {
  //var pos = getPosition(this, [].concat(type, value));
  //this.leftLocator = AP.slice.call(arguments);
  var pos = getPosition(this, slice.call(arguments));
  if (pos !== undefined) {
    this.loopStartPosition = pos;
    this.loopStart = pos.millis;
    this.loopStartTicks = pos.ticks;
  }
  this.illegalLoop = this.loopStart >= this.loopEnd;
  this.doLoop = (this.illegalLoop === false && this.loop === true);
  this.loopDuration = this.illegalLoop === true ? 0 : this.loopEnd - this.loopStart;
  // if(this.doLoop === false && this.loop === true){
  //     dispatchEvent('loop_off', this);
  // }
  //console.log('left', this.doLoop, this.illegalLoop, this.loop);
  //console.log(pos.millis, pos.millis, pos.ticks);
  //console.log('l', this.loopStartPosition, pos);
};


// right: song position < right locator
Song.prototype.setRightLocator = function() { //(value){
  //var pos = getPosition(this, [].concat(type, value));
  //this.rightLocator = AP.slice.call(arguments);
  var pos = getPosition(this, slice.call(arguments)),
    previousState = this.illegalLoop;
  //var pos = getPosition(this, value);
  if (pos !== undefined) {
    this.loopEndPosition = pos;
    this.loopEnd = pos.millis;
    this.loopEndTicks = pos.ticks;
  }
  //console.log(this.loopEnd);
  this.illegalLoop = this.loopEnd <= this.loopStart;
  this.doLoop = (this.illegalLoop === false && this.loop === true);
  this.loopDuration = this.illegalLoop === true ? 0 : this.loopEnd - this.loopStart;
  // if(previousState !== false && this.loop === true){
  //     dispatchEvent('loop_off', this);
  // }
  //console.log('right', this.doLoop, this.illegalLoop, this.loop);
  //console.log(pos.millis, pos.millis, pos.ticks);
  //console.log('r', this.loopEndPosition);
};


Song.prototype.setLoop = function(flag) {
  if (flag === undefined) {
    this.loop = !this.loop;
  } else if (flag === true || flag === false) {
    this.loop = flag;
  } else {
    if (sequencer.debug >= 1) {
      console.error('pass "true", "false" or no value');
    }
    return;
  }
  this.doLoop = (this.illegalLoop === false && this.loop === true);
};


Song.prototype.setPlayhead = function() {
  //console.log('setPlayhead');
  this.jump = true;
  this.scheduler.looped = false;
  this.scheduler.firstRun = true;
  this.timeStamp = sequencer.getTime() * 1000;
  this.startTime = this.timeStamp;
  try {
    this.startTime2 = window.performance.now();
    //this.startTime2 = undefined;
  } catch (e) {
    if (sequencer.debug) {
      console.log('window.performance.now() not supported');
    }
  }

  if (this.playing) {
    this.allNotesOff();
  }

  //console.log(slice.call(arguments));
  var pos = getPosition(this, slice.call(arguments)),
    millis = pos.millis;
  this.startMillis = millis;
  this.playhead.set('millis', millis);
  this.scheduler.setIndex(millis);
  //console.log(pos.bar, this.bar);
  //console.log(this.playhead.activeEvents);
};


Song.prototype.addEventListener = function() {
  return addEventListener.apply(this, arguments);
};


Song.prototype.removeEventListener = function() {
  removeEventListener.apply(this, arguments);
};


Song.prototype.addEvent = Song.prototype.addEvents = function() {
  var track, part;

  track = this.tracks[0];
  if (track === undefined) {
    track = sequencer.createTrack();
    this.addTrack(track);
  }
  // we need to find the first part on the track, so update the track if necessary
  if (track.needsUpdate) {
    track.update();
  }

  part = track.parts[0];
  if (part === undefined) {
    part = sequencer.createPart();
    track.addPart(part);
  }
  part.addEvents.apply(part, arguments);
  //console.log(part.needsUpdate);
  return this;
};


Song.prototype.addPart = Song.prototype.addParts = function() {
  var track = this.tracks[0];
  if (track === undefined) {
    //console.log('-> create track for parts')
    track = sequencer.createTrack();
    this.addTrack(track);
  }
  //console.log(arguments);
  track.addParts.apply(track, arguments);
  return this;
};


Song.prototype.addTrack = function() {
  var args = getArguments(arguments),
    arg0 = args[0],
    numArgs = args.length;

  if (typeString(arg0) === 'array' || numArgs > 1) {
    console.warn('please use addTracks() if you want to get more that one tracks');
    args = [arg0];
  }
  return addTracks(args, this)[0];
};


Song.prototype.addTracks = function() {
  //console.log(arguments, getArguments(arguments));
  return addTracks(getArguments(arguments), this);
};


Song.prototype.getTrack = function(arg) {
  return getTrack(arg, this);
};


Song.prototype.getTracks = function() {
  var args = getArguments(arguments),
    track, i,
    result = [];
  for (i = args.length - 1; i >= 0; i--) {
    track = getTrack(args[i], this);
    if (track) {
      result.push(track);
    }
  }
  return result;
};


Song.prototype.getPart = function() {
  var args = getArguments(arguments);
  if (args.length > 1) {
    console.warn('please use getParts() if you want to get more that one part');
  }
  //@TODO: check if a call is faster
  //return getParts(args, this)[0];
  return getParts.call(this, args)[0];
};


Song.prototype.getParts = function() {
  var args = getArguments(arguments);
  //return getParts(args, this);
  return getParts.call(this, args);
};


Song.prototype.removeTrack = function() {
  var args = getArguments(arguments);
  //var args = getArguments.apply(null, arguments);
  if (args.length > 1) {
    console.warn('please use removeTracks() if you want to remove more that one tracks');
  }
  //return _removeTracks(args, this)[0];
  return _removeTracks.call(this, args)[0];
};


Song.prototype.removeTracks = function() {
  return _removeTracks.call(this, getArguments(arguments));
};


Song.prototype.setPlaybackSpeed = function(speed) {
  if (speed < 0.01 || speed > 100) {
    console.error('playback speed has to be > 0.01 and < 100');
    return;
  }
  var ticks = this.ticks,
    startLoop, endLoop, newPos;

  this.playbackSpeed = speed;
  //console.log('setPlaybackSpeed -> update()');
  this.update(true);

  // get the new position of the locators after the update
  if (this.loopStartTicks !== undefined) {
    startLoop = this.getPosition('ticks', this.loopStartTicks);
    this.loopStart = startLoop.millis;
    this.loopStartTicks = startLoop.ticks;
  }
  if (this.loopEndTicks !== undefined) {
    endLoop = this.getPosition('ticks', this.loopEndTicks);
    this.loopEnd = endLoop.millis;
    this.loopEndTicks = endLoop.ticks;
  }

  // get the new position of the playhead after the update
  newPos = this.getPosition('ticks', ticks);
  this.setPlayhead('ticks', newPos.ticks);
};


Song.prototype.gridToSong = function(x, y, width, height) {
  return gridToSong(this, x, y, width, height);
};


Song.prototype.noteToGrid = function(note, height) {
  return noteToGrid(note, height, this);
};


Song.prototype.eventToGrid = function(event, width, height) {
  return eventToGrid(event, width, height, this);
};


Song.prototype.positionToGrid = function(position, width) {
  return positionToGrid(position, width, this);
};


Song.prototype.getPosition = function() {
  //console.log(slice.call(arguments));
  return getPosition(this, slice.call(arguments));
};


Song.prototype.ticksToMillis = function(ticks, beyondEndOfSong) {
  return ticksToMillis(this, ticks, beyondEndOfSong);
};


Song.prototype.millisToTicks = function(millis, beyondEndOfSong) {
  return millisToTicks(this, millis, beyondEndOfSong);
};


Song.prototype.ticksToBars = function(ticks, beyondEndOfSong) {
  return ticksToBars(this, ticks, beyondEndOfSong);
};


Song.prototype.millisToBars = function(millis, beyondEndOfSong) {
  return millisToBars(this, millis, beyondEndOfSong);
};


Song.prototype.barsToTicks = function() {
  return barsToTicks(this, slice.call(arguments));
};


Song.prototype.barsToMillis = function() {
  return barsToMillis(this, slice.call(arguments));
};


Song.prototype.findEvent = Song.prototype.findEvents = function(pattern) {
  return findEvent(this, pattern);
};


Song.prototype.findNote = Song.prototype.findNotes = function(pattern) {
  return findNote(this, pattern);
};


Song.prototype.getStats = function(pattern) {
  return getStats(this, pattern);
};


Song.prototype.createGrid = function(config) {
  if (this.grid === undefined) {
    this.grid = createGrid(this, config);
  } else {
    this.grid.update(config);
  }
  return this.grid;
};


Song.prototype.update = function(updateTimeEvents) {
  //console.log('Song.update()');
  update(this, updateTimeEvents);
};


Song.prototype.updateGrid = function(config) {
  this.grid.update(config);
  return this.grid;
};


Song.prototype.updateTempoEvent = function(event, bpm) {
  if (event.type !== sequencer.TEMPO) {
    if (sequencer.debug >= 4) {
      console.error('this is not a tempo event');
    }
    return;
  }
  if (event.song !== this) {
    if (sequencer.debug >= 4) {
      console.error('this event has not been added to this song yet');
    }
    return;
  }
  var ticks = this.ticks,
    percentage = this.percentage;
  event.bpm = bpm;
  this.update(true);
  this.updatePlayheadAndLocators(ticks);
};


Song.prototype.updateTimeSignatureEvent = function(event, nominator, denominator) {
  if (event.type !== sequencer.TIME_SIGNATURE) {
    if (sequencer.debug >= 4) {
      console.error('this is not a time signature event');
    }
    return;
  }
  if (event.song !== this) {
    if (sequencer.debug >= 4) {
      console.error('this event has not been added to this song yet');
    }
    return;
  }
  var ticks = this.ticks,
    percentage = this.percentage;
  event.nominator = nominator || event.nominator;
  event.denominator = denominator || event.denominator;
  this.update(true);
  this.updatePlayheadAndLocators(ticks);
};


Song.prototype.getTempoEvents = function() {
  return getTimeEvents(sequencer.TEMPO, this);
};


Song.prototype.getTimeSignatureEvents = function() {
  return getTimeEvents(sequencer.TIME_SIGNATURE, this);
};


Song.prototype.updatePlayheadAndLocators = function(ticks) {
  var newStartPos,
    newEndPos,
    startPos = this.loopStartPosition,
    endPos = this.loopEndPosition,
    newPos;

  // get the new position of the locators after the update
  if (startPos !== undefined) {
    /*
    newStartPos = this.getPosition('barsbeats', startPos.bar, startPos.beat, startPos.sixteenth, startPos.tick);
    if(newStartPos.ticks > this.durationTicks || newStartPos.bar > this.bars + 1){
        newStartPos = this.getPosition('barsbeats', 1, 1, 1, 0);
        console.log('start', newStartPos.barsAsString);
    }
    */
    newStartPos = this.getPosition('ticks', startPos.ticks);
    this.loopStart = newStartPos.millis;
    this.loopStartTicks = newStartPos.ticks;
    this.loopStartPosition = newStartPos;
  }
  if (endPos !== undefined) {
    /*
    newEndPos = this.getPosition('barsbeats', endPos.bar, endPos.beat, endPos.sixteenth, endPos.tick);
    if(newEndPos.ticks > this.durationTicks || newEndPos.bar > this.bars + 1){
        newEndPos = this.getPosition('barsbeats', this.bars, 1, 1, 0);
        console.log('end', newEndPos.barsAsString);
    }
    */
    //console.log('right locator', endPos.barsAsString, endPos.ticks);
    newEndPos = this.getPosition('ticks', endPos.ticks);
    if (newEndPos.ticks > this.durationTicks) {
      //console.log('right locator beyond end of song');
      newEndPos = this.getPosition('ticks', this.bars);
    }
    this.loopEnd = newEndPos.millis;
    this.loopEndTicks = newEndPos.ticks;
    this.loopEndPosition = newEndPos;
    //console.log('right locator', newEndPos.barsAsString, newEndPos.ticks);
  }
  //console.log('l', this.loopStartPosition, 'r', this.loopEndPosition);

  // get the new position of the playhead after the update
  /*
          newPos = this.getPosition('ticks', ticks);
          if(newPos.ticks > this.durationTicks || newPos.bar > this.bars + 1){
              newPos = this.getPosition('barsbeats', 1, 1, 1, 0);
              //console.log('playhead', newPos.barsAsString);
          }
  */
  newPos = this.getPosition('ticks', ticks);
  if (this.doLoop && newPos.ticks > this.durationTicks) {
    //console.log('playhead beyond end of song');
    this.setPlayhead('ticks', 0);
  } else {
    this.setPlayhead('ticks', newPos.ticks);
  }


  this.loopDuration = this.illegalLoop === true ? 0 : this.loopEnd - this.loopStart;
  /*
          console.log(percentage);
          newPos = this.getPosition('percentage', percentage);
          this.setPlayhead('ticks', newPos.ticks);
  */
};


Song.prototype.setTempo = function(bpm, update) {
  var timeEvents = getTimeEvents(sequencer.TEMPO, this),
    i, event,
    ticks = this.ticks,
    percentage = this.percentage,
    ratio = bpm / timeEvents[0].bpm;

  for (i = timeEvents.length - 1; i >= 0; i--) {
    event = timeEvents[i];
    event.bpm = ratio * event.bpm;
  }
  this.bpm = bpm;

  if (update === false) {
    return;
  }
  //console.log('setTempo -> update()');
  this.update(true);
  this.updatePlayheadAndLocators(ticks);
};


Song.prototype.setTimeSignature = function(nominator, denominator, update) {
  var timeEvents = getTimeEvents(sequencer.TIME_SIGNATURE, this),
    i, event,
    percentage = this.percentage,
    ticks = this.ticks;

  for (i = timeEvents.length - 1; i >= 0; i--) {
    event = timeEvents[i];
    event.nominator = nominator;
    event.denominator = denominator;
  }
  this.nominator = nominator;
  this.denominator = denominator;

  if (update === false) {
    return;
  }

  //console.log('setTimeSignature -> update()');
  this.update(true);
  this.updatePlayheadAndLocators(ticks);
};


Song.prototype.resetTempo = function(bpm) {
  var firstTempoEvent = getTimeEvents(sequencer.TEMPO, this)[0],
    timeEvents = this.timeEvents;

  firstTempoEvent.bpm = bpm;

  timeEvents = removeFromArray2(timeEvents, function(event) {
    if (event.type === 0x51) {
      return true;
    }
    return false;
  });

  this.numTimeEvents = timeEvents.length;
  this.update(true);
};


Song.prototype.resetTimeSignature = function(nominator, denominator) {
  var firstTimeSignatureEvent = getTimeEvents(sequencer.TIME_SIGNATURE, this)[0],
    timeEvents = this.timeEvents,
    ticks = this.ticks;

  firstTimeSignatureEvent.nominator = nominator;
  firstTimeSignatureEvent.denominator = denominator;

  timeEvents = removeFromArray2(timeEvents, function(event) {
    if (event.type === 0x58) {
      return true;
    }
    return false;
  });

  this.numTimeEvents = timeEvents.length;
  this.update(true);
  this.updatePlayheadAndLocators(ticks);
};


Song.prototype.addTimeEvent = Song.prototype.addTimeEvents = function() {
  var events = getArguments(arguments),
    ticks = this.ticks,
    i, event, position;

  //console.log(events);

  for (i = events.length - 1; i >= 0; i--) {
    event = events[i];
    if (event.className === 'MidiEvent') {
      if (event.type === sequencer.TEMPO) {
        this.timeEvents.push(event);
      } else if (event.type === sequencer.TIME_SIGNATURE) {
        /*
            A time signature event can only be positioned at the beginning of a bar,
            so we look for the nearest bar and put the event there.
        */
        position = this.getPosition('ticks', event.ticks);
        if (position.beat > position.nominator / 2) {
          position = this.getPosition('barsbeats', position.bar + 1);
        } else {
          position = this.getPosition('barsbeats', position.bar);
        }
        event.ticks = position.ticks;
        this.timeEvents.push(event);
      }
    }
  }
  this.numTimeEvents = this.timeEvents.length;
  this.update(true);
  //console.log('addTimeEvents', this.timeEvents);
  this.updatePlayheadAndLocators(ticks);
};

/*
    Song.prototype.addTimeEvent = function(){
        var events = getArguments(arguments),
            arg0 = events[0],
            numArgs = events.length;

        if(typeString(arg0) === 'array' || numArgs > 1){
            console.warn('please use addTimeEvents() if you want to add more that one time event');
            events = [arg0];
        }
        addTimeEvents(events, this);
    };
*/

// Song.prototype.removeTimeEvent = Song.prototype.removeTimeEvents = function() {
//   var tmp = getArguments(arguments),
//     i, maxi = tmp.length,
//     event,
//     ticks = this.ticks,
//     events = [];

//   for (i = 0; i < maxi; i++) {
//     event = tmp[i];
//     if (event !== this.tempoEvent && event !== this.timeSignatureEvent) {
//       events.push(event);
//     }
//   }
//   //console.log(events);

//   this.timeEvents = removeFromArray(events, this.timeEvents);
//   this.numTimeEvents = this.timeEvents.length;
//   this.update(true);
//   this.updatePlayheadAndLocators(ticks);
// };


// Song.prototype.removeDoubleTimeEvents = function() {
//   var events = [],
//     i, event, ticks, type,
//     eventsByTicks = {
//       '81': {},
//       '88': {},
//     };

//   //console.log('before', this.timeEvents);

//   for (i = this.timeEvents.length - 1; i >= 0; i--) {
//     event = this.timeEvents[i];
//     if (eventsByTicks[event.type][event.ticks] !== undefined) {
//       continue;
//     }

//     type = event.type;
//     ticks = event.ticks;
//     eventsByTicks[type][ticks] = event;

//     if (ticks === 0) {
//       if (type === 0x51) {
//         this.tempoEvent = event;
//       } else if (type === 0x58) {
//         this.timeSignatureEvent = event;
//       }
//     }
//   }

//   objectForEach(eventsByTicks['81'], function(event) {
//     events.push(event);
//   });

//   objectForEach(eventsByTicks['88'], function(event) {
//     events.push(event);
//   });

//   this.timeEvents = events;
//   this.update(true);

//   //console.log('after', this.timeEvents);
//   //this.timeEvents.forEach(function(event){
//   //    console.log(event.barsAsString, event.bpm, event.nominator, event.denominator);
//   //});
//   //console.log('tempo', this.tempoEvent.bpm, this.tempoEvent.nominator, this.tempoEvent.denominator, this.tempoEvent.barsAsString);
//   //console.log('time signature', this.timeSignatureEvent.bpm, this.timeSignatureEvent.nominator, this.timeSignatureEvent.denominator, this.timeSignatureEvent.barsAsString);
// };


// Song.prototype.setPitchRange = function(min, max) {
//   var me = this;
//   me.lowestNote = min;
//   me.highestNote = max;
//   me.numNotes = me.pitchRange = me.highestNote - me.lowestNote + 1;
// };


// Song.prototype.trim = function() {
//   checkDuration(this, true);
// };


// Song.prototype.setDurationInBars = function(bars) {
//   var me = this,
//     removedEvents = me.findEvent('bar > ' + bars),
//     removedParts = [],
//     changedTracks = [],
//     changedParts = [],
//     dirtyTracks = {},
//     dirtyParts = {};

//   //console.log(removedEvents);

//   removedEvents.forEach(function(event) {
//     var trackId = event.trackId,
//       partId = event.partId;

//     if (dirtyTracks[trackId] === undefined) {
//       dirtyTracks[trackId] = [];
//     }
//     dirtyTracks[trackId].push(event);

//     if (dirtyParts[partId] === undefined) {
//       dirtyParts[partId] = event.part;
//       //console.log(me.getPart(partId));
//     }
//   });

//   objectForEach(dirtyTracks, function(events, trackId) {
//     var track = me.getTrack(trackId);
//     //console.log(track.name)
//     track.removeEvents(events);
//     changedTracks.push(track);
//   });

//   objectForEach(dirtyParts, function(part, partId) {
//     if (part.events.length === 0) {
//       //console.log(partId, 'has no events');
//       part.track.removePart(part);
//       removedParts.push(part);
//     } else {
//       changedParts.push(part);
//     }
//   });

//   me.bars = bars;
//   me.lastBar = bars;

//   // user needs to call song.update() after setDurationInBars()!
//   //checkDuration(this);

//   //console.log(this.ticks);

//   return {
//     removedEvents: removedEvents,
//     removedParts: removedParts,
//     changedTracks: changedTracks,
//     changedParts: changedParts
//   };
// };


// Song.prototype.addEffect = function() {};


// Song.prototype.removeEffect = function() {};


// Song.prototype.setVolume = function() { // value, Track, Track, Track, etc. in any order
//   var args = slice.call(arguments),
//     numArgs = args.length,
//     tracks = [],
//     value, i;

//   function loop(data, i, maxi) {
//     for (i = 0; i < maxi; i++) {
//       var arg = data[i],
//         type = typeString(arg);

//       if (type === 'array') {
//         loop(arg, 0, arg.length);
//       } else if (type === 'number') {
//         value = arg;
//       } else if (arg.className === 'Track') {
//         tracks.push(arg);
//       }
//     }
//   }

//   if (numArgs === 1) {
//     value = args[0];
//     if (isNaN(value)) {
//       console.warn('please pass a number');
//       return;
//     }
//     this.volume = value < 0 ? 0 : value > 1 ? 1 : value;
//     this.gainNode.gain.value = this.volume;
//   } else {
//     loop(args, 0, numArgs);
//     for (i = tracks.length - 1; i >= 0; i--) {
//       tracks[i].setVolume(value);
//     }
//   }
// };


// Song.prototype.getVolume = function() {
//   return this.gainNode.gain.value;
// };


// Song.prototype.connect = function() {
//   this.gainNode.connect(masterGainNode);
//   //this.gainNode.connect(context.destination);
// };


// Song.prototype.disconnect = function() {
//   this.gainNode.disconnect(masterGainNode);
//   //this.gainNode.disconnect(context.destination);
// };

/*
    Song.prototype.cleanUp = function(){
        // add other references that need to be removed
        this.disconnect(masterGainNode);
        //this.disconnect(context.destination);
    };
*/

// Song.prototype.getMidiInputs = function(cb) {
//   getMidiInputs(cb, this);
// };


// Song.prototype.getMidiOutputs = function(cb) {
//   getMidiOutputs(cb, this);
// };


// Song.prototype.setTrackSolo = function(soloTrack, flag) {
//   var i, track;
//   for (i = this.numTracks - 1; i >= 0; i--) {
//     track = this.tracks[i];
//     if (flag === true) {
//       track.mute = track === soloTrack ? !flag : flag;
//     } else if (flag === false) {
//       track.mute = false;
//     }
//     track.solo = track === soloTrack ? flag : false;
//   }
// };


// Song.prototype.muteAllTracks = function(flag) {
//   var i, track;
//   for (i = this.numTracks - 1; i >= 0; i--) {
//     track = this.tracks[i];
//     track.mute = flag;
//   }
// };


// Song.prototype.setMetronomeVolume = function(value) {
//   this.metronome.setVolume(value);
// };

// Song.prototype.configureMetronome = function(config) {
//   //console.log(config)
//   this.metronome.configure(config);
// };

// Song.prototype.resetMetronome = function() {
//   this.metronome.reset();
// };


// Song.prototype.setPrecount = function(value) {
//   this.precount = value;
// };


// Song.prototype.allNotesOff = function() {
//   //console.log('song.allNotesOff');
//   /*
//   var i;
//   for(i in this.tracks){
//       if(this.tracks.hasOwnProperty(i)){
//           this.tracks[i].instrument.allNotesOff();
//       }
//   }
//   */
//   objectForEach(this.tracks, function(track) {
//     track.allNotesOff();
//     // track.audio.allNotesOff();
//     // track.instrument.allNotesOff();
//   });
//   this.metronome.allNotesOff();
//   this.resetExternalMidiDevices();
// };


// Song.prototype.resetExternalMidiDevices = function() {
//   //var time = this.millis + (sequencer.bufferTime * 1000); // this doesn't work, why? -> because the scheduler uses a different time
//   var time = this.scheduler.lastEventTime + 100;
//   if (isNaN(time)) {
//     time = 100;
//   }
//   //console.log('allNotesOff', this.millis, this.scheduler.lastEventTime, time);
//   objectForEach(this.midiOutputs, function(output) {
//     //console.log(output);
//     output.send([0xB0, 0x7B, 0x00], time); // stop all notes
//     output.send([0xB0, 0x79, 0x00], time); // reset all controllers
//     //output.send([176, 123, 0], sequencer.getTime());
//   });
// };


// Song.prototype.addMidiEventListener = function() {
//   return addMidiEventListener(arguments, this);
// };


// Song.prototype.removeMidiEventListener = function(id) {
//   removeMidiEventListener(id, this);
// };


// Song.prototype.removeMidiEventListeners = function() {
//   removeMidiEventListener(arguments, this);
// };


// Song.prototype.getMidiInputsAsDropdown = function(config) {
//   config = config || {
//     type: 'input'
//   };
//   return getMidiPortsAsDropdown(config, this);
// };


// Song.prototype.getMidiOutputsAsDropdown = function(config) {
//   config = config || {
//     type: 'output'
//   };
//   return getMidiPortsAsDropdown(config, this);
// };

// Song.prototype.setMidiInput = function(id, flag) {
//   setMidiInput(id, flag, this);
// };


// Song.prototype.setMidiOutput = function(id, flag) {
//   setMidiOutput(id, flag, this);
// };


// Song.prototype.getNoteLengthName = function(ticks) {
//   return getNoteLengthName(this, ticks);
// }

export default {
  createSong: (config) => {
    return new Song(config);
  }
}

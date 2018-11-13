class Track {
.prototype.addPart = Track.prototype.addParts = function() { //newParts
    //console.log('addPart',arguments);
    var args = getPartsAndConfig(arguments, this);
    addParts(args, this);
};


//addPartsAt(part1,part2,'ticks',480,1920); -> no
//addPartsAt([part1,part2],'ticks',[480,1920]); -> no
//addPartsAt([part1,part2],['ticks',480,1920]); -> no

//addPartsAt([part1, part2], [['ticks',480], ['ticks',1920]]); -> yes
//addPartsAt(part1, part2, ['ticks',480], ['ticks',1920]); -> yes
//addPartsAt(part1, part2, [['ticks',480], ['ticks',1920]]); -> yes
//addPartsAt([part1, part2], ['ticks',480], ['ticks',1920]); -> yes

Track.prototype.addPartAt = Track.prototype.addPartsAt = function() {
    var args = getPartsAndConfig(arguments, this),
        config,
        parts,
        i, part, ticks;

    if (args === false) {
        return;
    }

    parts = args.parts;
    config = args.config;

    if (config === undefined) {
        console.error('please provide position data');
        return false;
    }

    //console.log('addPartsAt', args.parts, args.config);

    for (i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (config[0] === 'ticks') {
            ticks = config[1];
        } else {
            ticks = getTicksAtPosition(config[i], this.song);
        }
        //console.log('addPartsAt',this.id, part.track, part.id, ticks, config[i]);
        //console.log(part.ticks, ticks);
        if (ticks === false) {
            continue;
        }
        part.ticks += ticks;
    }

    addParts(args, this);
};

/*
    Track.prototype.addPartAt = function(part, position){
        var ticks = getTicksAtPosition(position);
        part = getPart(part, this);

        if(ticks === false){
            console.error('please provide a valid position');
            return false;
        }

        if(part === false){
            console.error('please provide a valid part');
            return false;
        }

        part.ticks += ticks;
        //console.log(ticks);
        addParts({parts:[part], config:[]}, this);
    };
*/

Track.prototype.movePart = Track.prototype.moveParts = function() { //parts, ticks
    var args = getPartsAndConfig(arguments, this);
    moveParts(args, this);
};


Track.prototype.movePartTo = Track.prototype.movePartsTo = function() { //selectedParts, position
    var args = getPartsAndConfig(arguments, this);
    //console.log('movePartTo', args);
    movePartsTo(args, this);
};


Track.prototype.moveAllParts = function(ticks) {
    this.moveParts({
        parts: this.parts,
        config: [ticks]
    });
};


Track.prototype.copyPart = Track.prototype.copyParts = function() {
    var args = getPartsAndConfig(arguments, this),
        selectedParts,
        copiedParts = [];

    if (args === false) {
        return;
    }

    if (selectedParts.length === 0) {
        console.error('no parts');
        return;
    }
    selectedParts = args.parts;

    selectedParts.forEach(function(part) {
        copiedParts.push(part.copy());
    });

    return copiedParts.length === 1 ? copiedParts[0] : copiedParts;
};


Track.prototype.removePart = function() {
    var args = getPartsAndConfig(arguments, this),
        removed = removeParts(args, this);
    return removed.length === 1 ? removed[0] : removed;
};


Track.prototype.removeParts = function() {
    var args = getPartsAndConfig(arguments, this);
    return removeParts(args, this);
};


Track.prototype.getPart = function(arg) {
    return getPart(arg);
};


Track.prototype.getParts = function() {
    var args = Array.prototype.slice.call(arguments),
        arg,
        result = [],
        loop;

    loop = function(data, i) {
        arg = data[i];
        if (typeString(arg) === 'array') {
            loop(arg, 0);
        } else {
            result.push(getPart(arg));
        }
    };

    loop(args, 0);
    return result;
};


Track.prototype.getPartAt = Track.prototype.getPartsAt = function(position) {
    var ticks = getTicksAtPosition(position, this.song),
        parts = this.parts,
        selectedParts = [];

    if (ticks === false) {
        console.error('please provide position as array, for instance: [\'barsandbeats\',5,1,2,0]');
        return;
    }

    parts.forEach(function(part) {
        if (part.ticks === ticks) {
            selectedParts.push(part);
        }
    });

    return selectedParts;
};


Track.prototype.getPartFromTo = Track.prototype.getPartsFromTo = function(from, to) {
    var parts = this.parts,
        selectedParts = [],
        fromTicks = getTicksAtPosition(from, this.song),
        toTicks = getTicksAtPosition(to, this.song);

    if (fromTicks === false) {
        console.error('invalid position data for from position');
        return;
    }

    if (toTicks === false) {
        console.error('invalid position data for from position');
        return;
    }

    parts.forEach(function(part) {
        if (fromTicks >= part.start.ticks && fromTicks <= part.end.ticks || toTicks >= part.start.ticks && toTicks <= part.end.ticks) {
            selectedParts.push(part);
        }
    });

    return selectedParts;
};


Track.prototype.getPartBetween = Track.prototype.getPartBetween = function(from, to) {
    var parts = this.parts,
        selectedParts = [],
        fromTicks = getTicksAtPosition(from, this.song),
        toTicks = getTicksAtPosition(toTicks, this.song);

    if (fromTicks === false || toTicks === false) {
        console.error('please provide position as array, for instance: [\'barsandbeats\',5,1,2,0]');
        return;
    }

    parts.forEach(function(part) {
        if (part.start.ticks >= fromTicks && part.end.ticks <= toTicks) {
            selectedParts.push(part);
        }
    });

    return selectedParts;
};


Track.prototype.copy = function() {
    var track = new Track(copyName(this.name)),
        part, i, effect,
        parts = this.parts,
        copiedParts = [];

    track.song = null;
    track.instrumentId = this.instrumentId;
    track.numEffects = this.numEffects;
    if (this.numEffects > 0) {
        track.effects = {};
        for (i in this.effects) {
            if (this.effects.hasOwnProperty(i)) {
                effect = this.effects[i];
                track.effects[effect.id] = effect.copy();
            }
        }
    }

    for (i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        copiedParts.push(part.copy());
    }
    //console.log(parts.length);
    track.addParts(copiedParts);
    return track;
};


Track.prototype.removeEvent = Track.prototype.removeEvents = function() { //events
    var args = getEventsAndConfig(arguments, this);
    removeEvents(args.events, this);
};


Track.prototype.removeEventsFromTo = function(from, to) {
    console.warn('removeEventsFromTo() is temporarily disabled');
    //removeEventsFromTo(from, to, this);
};


Track.prototype.removeEventAt = Track.prototype.removeEventsAt = function(position) {
    console.warn('removeEventAt() is temporarily disabled');
    //removeEventsAt(position, this);
};


Track.prototype.removeAllEvents = function() {
    removeEvents(this.events, this);
};


Track.prototype.transposePart = function(part, semi) {
    var stats = part.getStats('noteNumber all'),
        min = 0,
        max = 127,
        semi2;
    //console.log('transposePart', semi);
    if (this.song) {
        min = this.song.lowestNote;
        max = this.song.highestNote;
    }
    //console.log(stats.min, min, stats.max, max);
    if (stats.min + semi < min) {
        semi2 = min - stats.min;
        return;
    } else if (stats.max + semi > max) {
        semi2 = max = stats.max;
        return;
    }
    //console.log(semi, semi2);
    part.transposeAllEvents(semi);
};

// Track.prototype.addEvents = function(){
//     var part = sequencer.createPart();
//     part.addEvents(arguments);
//     this.addPart(part);
// };

// move events
/*
    Track.prototype.moveEvent = Track.prototype.moveEvents = function(){//events, ticks
        var args = getEventsAndConfig(arguments);
        moveEvents(args.config[0], args.events, this);
    };


    Track.prototype.moveEventTo = Track.prototype.moveEventsTo = function(){//events, position
        var args = getEventsAndConfig(arguments);
        moveEventsTo(args.config[0], args.events, this);
    };


    Track.prototype.moveAllEvents = function(ticks){
        moveEvents(ticks, this.events, this);
    };


    Track.prototype.moveAllEventsTo = function(position){
        moveEventsTo(position, this.events, this);
    };


    // copy events

    Track.prototype.copyEvent = Track.prototype.copyEvents = function(){//events
        var args = getEventsAndConfig(arguments);
        return copyEvents(args.events);
    };


    Track.prototype.copyAllEvents = function(){
        return copyEvents(this.events);
    };


    Track.prototype.copyEventTo = Track.prototype.copyEventsTo = function(){//events, position
        var args = getEventsAndConfig(arguments);
        copyEventsTo(args.config[0], args.events, this);
    };


    Track.prototype.copyAllEventsTo = function(position){
        copyEventsTo(position, this.events, this);
    };


    // repeat events

    Track.prototype.repeatEvent = Track.prototype.repeatEvents = function(){//events, config
        var args = getEventsAndConfig(arguments);
        repeatEvents(args.config[0], args.events, this);
    };


    // transpose events

    Track.prototype.transposeEvent = Track.prototype.transposeEvents = function(){//events, semi
        var args = getEventsAndConfig(arguments);
        transposeEvents(args.config[0], args.events);
    };


    Track.prototype.transpose = Track.prototype.transposeAllEvents = function(semi){
        transposeEvents(semi, this.events);
    };
*/

Track.prototype.reset = function() {
    var id, part;
    this.song = null;
    // fixing issue #5
    if (this.audio) {
        this.audio.setSong(null);
    }
    for (id in this.partsById) {
        if (this.partsById.hasOwnProperty(id)) {
            part = this.partsById[id];
            // don't reset from track, reset from song only
            part.reset(false, true);
            //part.state = 'removed';
        }
    }
    this.needsUpdate = true;
};


// find event utils

Track.prototype.findEvent = function(pattern) {
    return findEvent(this, pattern);
};


Track.prototype.findNote = function(pattern) {
    return findNote(this, pattern);
};


Track.prototype.getStats = function(pattern) {
    return getStats(this, pattern);
};


Track.prototype.update = function() {
    //console.log('track update');
    //@TODO: do we need events and notes in a track?

    this.parts = [];
    this.notes = [];
    this.events = [];

    var i, id, part, event, events, note;
    for (id in this.partsById) {
        if (this.partsById.hasOwnProperty(id)) {
            part = this.partsById[id];

            if (part.needsUpdate === true) {
                //console.log(part);
                part.update();
            }

            //console.log(part.events.length, part.keepWhenEmpty);

            if (part.events.length === 0 && part.keepWhenEmpty === false) {
                this.removePart(part);
            }

            if (part.state === 'new' && this.song !== undefined) {
                events = part.events;
                for (i = events.length - 1; i >= 0; i--) {
                    event = events[i];
                    event.song = this.song;
                }
            }

            if (part.state !== 'removed') {
                this.parts.push(part);
                this.notes = this.notes.concat(part.notes);
                this.events = this.events.concat(part.events);
            }
        }
    }

    this.parts.sort(function(a, b) {
        return a.ticks - b.ticks;
    });

    this.notes.sort(function(a, b) {
        return a.ticks - b.ticks;
    });

    this.events.sort(function(a, b) {
        return a.sortIndex - b.sortIndex;
    });


    this.numEvents = this.events.length;
    this.numNotes = this.notes.length;
    this.numParts = this.parts.length;

    for (i = this.numEvents - 1; i >= 0; i--) {
        event = this.events[i];
        this.eventsById[event.id] = event;
    }

    for (i = this.numNotes - 1; i >= 0; i--) {
        note = this.notes[i];
        this.notesById[note.id] = note;
    }

    this.needsUpdate = false;
};


Track.prototype.getIndex = function() {
    var index = -1,
        tracks = this.song.tracks,
        numTracks = tracks.length,
        track, i;

    if (numTracks > 0) {

        for (i = 0; i < numTracks; i++) {
            track = tracks[i];
            if (track.id === this.id) {
                index = i;
                break;
            }
        }
    }
    return index;
};


/*

    Track:
     input
     panner
     output


     input
     fx
     panner
     output


     input
     fx
     fx2
     panner
     output

*/

Track.prototype.addEffect = function(effect, position) {
    if (!effect) {
        return;
    }
    // //effect.setInput(this.input);
    /*
            //this.input.connect(effect.node);
            this.input.disconnect(0);
            try{
                this.input.disconnect(1);
            }catch(e){
                console.log(e);
            }
            effect.setInput(this.input);
            effect.node.connect(this.panner.node);

    //CONNNECT
    return;
    */

    //console.log(effect);

    this.effects[effect.id] = effect;
    this.numEffects++;

    if (this.lastEffect !== undefined) {
        // disconnect output from panner
        this.lastEffect.disconnect(0);
        // try{
        //     this.input.disconnect(1);
        // }catch(e){
        //     console.log(e);
        // }
        // connect output to input of new effect
        effect.setInput(this.lastEffect);
    }
    // connect new effect to panner
    effect.output.connect(this.panner.node);

    // remember the last effect in case we want to add another effect
    this.lastEffect = effect.output;


    /*
            if(position !== undefined && isNaN(position) === false){
                this.setEffectPosition(position);
            }else{
                effect.position = this.numEffects;
            }
            this.numEffects++;
    */
};


Track.prototype.removeEffect = function(effect) {
    if (effect === false) {
        return;
    }
    delete this.effects[effect.id];
    this.numEffects--;
};


Track.prototype.setEffectPosition = function(effect, position) {
    var i, fx, maxi = this.numEffects - 1;

    if (position < 0 || position > maxi) {
        return;
    }

    effect.position = position;
    for (i = 0; i < maxi - 1; i++) {
        fx = this.effects[i];
        if (fx.position >= position && fx !== effect) {
            fx.position += 1;
        }
    }
};


Track.prototype.setSolo = function(flag) {
    if (flag === undefined) {
        flag = !this.solo;
    }
    this.mute = false;
    this.solo = flag;
    if (this.song) {
        this.song.setTrackSolo(this, flag);
    }
};


Track.prototype.setPartSolo = function(soloPart, flag) {
    var i, part;
    for (i = this.numParts - 1; i >= 0; i--) {
        part = this.parts[i];
        if (flag === true) {
            part.mute = part === soloPart ? !flag : flag;
        } else if (flag === false) {
            part.mute = false;
        }
        part.solo = part === soloPart ? flag : false;
        //console.log(soloPart.id, soloPart.mute, part.id, part.mute);
    }
};


Track.prototype.setVolume = function(value) {
    if (isNaN(value)) {
        if (sequencer.debug >= 1) {
            console.error('please pass a number');
        }
    } else if (value < 0 || value > 1) {
        if (sequencer.debug >= 1) {
            console.error('please pass a float between 0 and 1');
        }
    } else {
        this.volume = value;
        //console.log(value);
        //this.output.gain.value = this.volume; //-> this doesn't work which is weird
        this.input.gain.value = this.volume; // this does work
    }
};


Track.prototype.getVolume = function() {
    return this.volume;
};

Track.prototype.setPanning = function(value) {
    this.panner.setPosition(value);
};


Track.prototype.connect = function(node) {
    //this.panner.node.connect(node);
    this.output.connect(node);
};


Track.prototype.disconnect = function(node) {
    //this.panner.node.disconnect(node);
    this.output.disconnect(0);
};


function getDefaultInstrumentConfig(track) {
    var config;
    if (track.song !== undefined && track.song.defaultInstrument !== undefined) {
        config = findItem(track.song.defaultInstrument, sequencer.storage.instruments);
        //console.log('default instrument song', track.song.defaultInstrument);
    }
    if (config === false || config === undefined) {
        config = findItem(sequencer.defaultInstrument, sequencer.storage.instruments);
        //console.log('default instrument sequencer', sequencer.defaultInstrument, config);
        //console.log(sequencer.storage.instruments.heartbeat.sinewave);
    }
    return config;
}


Track.prototype.setInstrument = function(arg) {
    //console.log('Track.setInstrument()', arg.name, this.name);
    if (arg === '' || arg === undefined || arg === false) {
        arg = getDefaultInstrumentConfig(this);
        //console.log('default', arg);
    }
    var instrument = createInstrument(arg);

    //console.log(instrument);

    if (instrument === false) {
        instrument = createInstrument(getDefaultInstrumentConfig(this));
    }

    /*
            var instrument;

            if(arg === '' || arg === undefined || arg === false){
                getDefaultInstrumentConfig(this);
            }else{
                instrument = createInstrument(arg);
            }

    */
    instrument.track = this;
    // stop possible scheduled notes by the previous instrument
    if (this.instrument) {
        this.instrument.allNotesOff();
    }
    this.instrument = instrument;
    this.instrumentId = instrument.name;
    if (this.song) {
        this.instrument.song = this.song;
    }
};


Track.prototype.setMidiInput = function(id, flag) {
    var input, i,
        midiInputs = this.midiInputs,
        availableInputs;

    //console.log(id, flag, this.song.midiInputs[id]);

    flag = flag === undefined ? true : flag;

    if (id === 'all') {
        availableInputs = this.song !== undefined ? this.song.midiInputs : sequencer.midiInputs;
        objectForEach(availableInputs, function(value, key) {
            if (flag === true) {
                midiInputs[key] = value;
            } else {
                delete midiInputs[key];
            }
        });
        //console.log(sequencer.midiInputs, this.midiInputs, midiInputs);
        return;
    }

    input = this.song.midiInputs[id];
    //console.log(input, id);
    if (input === undefined) {
        return;
    }
    //this.midiInputs[id] = flag === true ? input : false;
    if (flag) {
        this.midiInputs[id] = input;
    } else {
        delete this.midiInputs[id];
    }
};


Track.prototype.setMidiOutput = function(id, flag) {
    // a track can, unlike Cubase, send its events to more than one midi output
    flag = flag === undefined ? true : flag;

    //console.log(id, flag, this.song.midiOutputs);

    var output = this.song.midiOutputs[id],
        me = this;

    if (output === undefined) {
        return;
    }


    // stop the internal instrument if a midi output has been chosen -> particulary necessary while the song is playing
    if (flag === true) {
        this.instrument.allNotesOff();
    }

    //this.midiOutputs[id] = flag === true ? output : false;
    if (flag) {
        this.midiOutputs[id] = output;
    } else {
        delete this.midiOutputs[id];
    }

    this.routeToMidiOut = false;

    //console.log(this.midiOutputs[id]);
    objectForEach(this.midiOutputs, function(value, key) {
        //console.log(value, key);
        if (value !== false) {
            me.routeToMidiOut = true;
        }
    });
    //console.log(output, id, this.routeToMidiOut);
};


Track.prototype.prepareForRecording = function(recordId, callback) {
    //console.log('prepare', this.recordEnabled, recordId);
    if (this.recordEnabled !== 'midi' && this.recordEnabled !== 'audio') {
        return;
    }
    this.recordPart = sequencer.createPart();
    this.addPart(this.recordPart);
    //console.log(this.recordPart.needsUpdate);
    this.recordingNotes = {};
    this.recordId = recordId;

    if (this.recordEnabled === 'audio') {
        if (this.audio === undefined) {
            this.audio = createAudioTrack(this);
        }
        this.audio.prepareForRecording(recordId, callback);
    }
    //console.log(this.recordEnabled);
};


Track.prototype.stopRecording = function(recordId, callback) {
    //console.log(recordId, this.recordId);
    if (this.recordId !== recordId) {
        return;
    }

    this.recordingNotes = {};
    if (this.autoQuantize || this.song.autoQuantize) {
        if (debug >= 1) {
            console.log('performing auto quantize');
        }
        this.quantizeRecording();
    }

    if (this.recordEnabled === 'midi') {
        this.recordPart.update();
        callback(this.recordPart.events);
    } else if (this.recordEnabled === 'audio') {
        var scope = this;
        this.audio.stopRecording(function(recording) {

            var event = sequencer.createAudioEvent({
                ticks: scope.song.recordTimestampTicks,
                buffer: recording.audioBuffer,
                sampleId: recording.id,
            });

            scope.recordPart.addEvent(event);
            scope.recordPart.update();
            callback([event]);
        });
    }
};

/*
    Track.prototype.undoRecording = function(recordId){
        if(this.recordId !== recordId){
            return;
        }
        this.removePart(this.recordPart);
    };
*/

Track.prototype.undoRecording = function(data) {
    var type = typeString(data);
    if (type === 'string') {
        if (this.recordId === data) {
            this.removePart(this.recordPart);
        }
    } else if (type === 'array') {
        //console.log(data);
        this.removeEvents(data);
    }
};


Track.prototype.setWaveformConfig = function(config) {
    this.waveformConfig = config;
    if (this.audio !== undefined) {
        this.audio.recorder.waveformConfig = config;
    }
};


Track.prototype.getAudioRecordingData = function(recordId) {
    if (this.audio === undefined) {
        return;
    }
    if (recordId === undefined) {
        if (sequencer.debug >= sequencer.WARN) {
            console.warn('please provide a recording id');
        }
        return false;
    }
    return sequencer.storage.audio.recordings[recordId];
};


Track.prototype.encodeAudioRecording = function(recordId, type, bitrate, callback) {
    if (this.audio === undefined) {
        return;
    }
    if (recordId === undefined) {
        if (sequencer.debug >= sequencer.WARN) {
            console.warn('please provide a recording id');
        }
        if (callback) {
            callback(false);
        }
        return;
    }

    var recording = sequencer.storage.audio.recordings[recordId];
    encodeAudio(recording.audioBuffer, type, bitrate, function(mp3Data) {
        recording.mp3 = mp3Data;
        callback(recording);
    });
};


Track.prototype.setAudioRecordingLatency = function(recordId, value, callback) {
    if (this.audio !== undefined) {
        //console.log(recordId, sequencer.storage.audio.recordings);
        this.audio.setAudioRecordingLatency(recordId, value, function(recording) {
            // update all audio events in this song that use this recording

            var i, event, sampleId,
                audioEvents = this.song.audioEvents;

            for (i = audioEvents.length - 1; i >= 0; i--) {
                event = audioEvents[i];
                sampleId = event.sampleId;
                if (sampleId === undefined) {
                    continue;
                }
                if (recordId === sampleId) {
                    event.buffer = recording.audioBuffer;
                }
            }

            if (callback !== undefined) {
                callback();
            }
        });
    }
};


Track.prototype.quantizeRecording = function(value) {
    value = value || this.quantizeValue;
    return sequencer.quantize(this.recordPart.events, value, this.song.ppq);
};


// non-mandatory arguments: quantize value, history object
Track.prototype.quantize = function() {
    var i, arg, type,
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
            // overrule the quantize value of this track with this value
            value = arg;
        } else if (type === 'object') {
            historyObject = arg;
        }
    }

    // no value passed as arguments, use the quantize value of this track
    if (value === undefined) {
        value = this.quantizeValue;
    }

    //console.log(value, history);
    return sequencer.quantize(this.events, value, this.song.ppq, history); // sequencer.quantize is defined in quantize_fixed-length.js
};


Track.prototype.undoQuantize = function(history) {
    if (history === undefined) {
        if (sequencer.debug >= 2) {
            console.warn('please pass a quantize history object');
        }
        return;
    }

    var events = history.tracks[this.id].quantizedEvents,
        numEvents = events.length,
        i, event;

    for (i = 0; i < numEvents; i++) {
        event = events[i];
        event.ticks = history.events[event.id].ticks;
        //console.log(event.ticks, event.type);
    }
};


Track.prototype.addMidiEventListener = function() {
    return addMidiEventListener(arguments, this);
};


Track.prototype.removeMidiEventListener = function(id) {
    removeMidiEventListener(id, this);
};


Track.prototype.allNotesOff = function(id) {
    if (this.audio) {
        this.audio.allNotesOff();
    }
    if (this.instrument) {
        this.instrument.allNotesOff();
    }
};


Track.prototype.processMidiEvent = function(event) {
    handleMidiMessageTrack(event, this)
}

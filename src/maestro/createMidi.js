import base64ToBinary from './utils/base64ToBinary';
import parseMidiFile from './utils/parseMidiFile';
import Part from './types/Part';
import Track from './types/Track';

const defaultPPQ = 960;

function createPart(){
  return new Part();
}

function createTrack(name, type, song) {
  return new Track(name, type, song);
}

function parse(midifile, buffer, resolve) {
  let data, i, j, numEvents, part, track, numTracks,
    events, event, ticks, tmpTicks, channel,
    parsed, timeEvents, noteNumber, bpm,
    lastNoteOn, lastNoteOff, ppqFactor,
    type, lastType, lastData1, lastData2,
    numNoteOn, numNoteOff, numOther, noteOns, noteOffs;

  buffer = new Uint8Array(buffer);
  data = parseMidiFile(buffer);

  midifile.base64 = '';
  midifile.numTracks = 0;

  i = 0;
  numTracks = data.tracks.length;
  if (sequencer.overrulePPQ === true && isNaN(sequencer.defaultPPQ) === false && sequencer.defaultPPQ > 0) {
    ppqFactor = defaultPPQ / data.header.ticksPerBeat;
    midifile.ppq = defaultPPQ;
  } else {
    ppqFactor = 1;
    midifile.ppq = data.header.ticksPerBeat;
  }
  timeEvents = [];
  midifile.tracks = [];

  while (i < numTracks) {
    events = data.tracks[i];
    numEvents = events.length;
    ticks = 0;
    tmpTicks = 0;
    channel = -1;
    part = createPart();
    track = createTrack();
    parsed = [];
    j = 0;
    numNoteOn = 0;
    numNoteOff = 0;
    numOther = 0;
    noteOns = {};
    noteOffs = {};

    for (j = 0; j < numEvents; j++) {
      event = events[j];
      tmpTicks += (event.deltaTime * ppqFactor);

      if (channel === -1 && event.channel !== undefined) {
        channel = event.channel;
        track.channel = channel;
      }

      type = event.subtype;

      if (type === 'noteOn') {
        numNoteOn++;
      } else if (type === 'noteOff') {
        numNoteOff++;
      } else {
        numOther++;
      }

      switch (event.subtype) {

        case 'trackName':
          track.name = event.text;
          break;

        case 'instrumentName':
          if (event.text) {
            track.instrumentName = event.text;
          }
          break;

        case 'noteOn':
          parsed.push(createMidiEvent(tmpTicks, 0x90, event.noteNumber, event.velocity));
          break;

        case 'noteOff':
          parsed.push(createMidiEvent(tmpTicks, 0x80, event.noteNumber, event.velocity));
          break;

        case 'setTempo':
          bpm = 60000000 / event.microsecondsPerBeat;
          if (tmpTicks === ticks && lastType === type) {
            timeEvents.pop();
          }

          if (midifile.bpm === undefined) {
            midifile.bpm = bpm;
          }

          timeEvents.push(createMidiEvent(tmpTicks, 0x51, bpm));
          break;

        case 'timeSignature':
          if (tmpTicks === ticks && lastType === type) {
            timeEvents.pop();
          }

          if (midifile.nominator === undefined) {
            midifile.nominator = event.numerator;
            midifile.denominator = event.denominator;
          }

          timeEvents.push(createMidiEvent(tmpTicks, 0x58, event.numerator, event.denominator));
          break;

        case 'controller':
          parsed.push(createMidiEvent(tmpTicks, 0xB0, event.controllerType, event.value));
          break;

        case 'programChange':
          parsed.push(createMidiEvent(tmpTicks, 0xC0, event.programNumber));
          break;

        case 'channelAftertouch':
          parsed.push(createMidiEvent(tmpTicks, 0xD0, event.amount));
          break;

        case 'pitchBend':
          parsed.push(createMidiEvent(tmpTicks, 0xE0, event.value));
          break;
      }
      lastType = type;
      ticks = tmpTicks;
    }

    if (parsed.length > 0) {
      track.addPart(part);
      part.addEvents(parsed);
      midifile.tracks.push(track);
      midifile.numTracks++;
    }
    i++;
  }

  midifile.timeEvents = timeEvents;
  midifile.autoSize = true;
  midifile.loaded = true;

  resolve(midifile);
}

function midiFromBase64(config) {
  const readerSync = new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('loadend', () => {
      parse({}, reader.result, (midifile) => {
        resolve(midifile);
      });
    });

    reader.addEventListener('error', reject.bind(this));
    parse({}, base64ToBinary(config.base64), resolve.bind(this));
  });

  return readerSync;
}


export default function createMIDIFile(config) {
  const midiFile = midiFromBase64(config);
  return midiFile;
}

export default function readChunk(stream) {
  const id = stream.read(4, true);
  const length = stream.readInt32();
  return {
    id,
    length,
    'data': stream.read(length, false)
  };
}

export const processSSEChunk = (buffer, chunk, onLine) => {
  let workingBuffer = buffer + chunk;
  const lines = workingBuffer.split('\n');
  workingBuffer = lines.pop() ?? '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      onLine(trimmedLine);
    }
  }

  return workingBuffer;
};

export const flushSSEBuffer = (buffer, onLine) => {
  const trimmedLine = buffer.trim();
  if (trimmedLine) {
    onLine(trimmedLine);
  }
  return '';
};

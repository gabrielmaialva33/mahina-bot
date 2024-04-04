import { parentPort } from 'node:worker_threads'
import prism from 'prism-media'

export const opus = new prism.opus.Encoder({
  channels: 2,
  rate: 48000,
  frameSize: 960,
})

opus.on('data', (chunk: Buffer) => parentPort?.postMessage(chunk, [chunk.buffer]))

parentPort?.on('message', (buffer) => {
  opus.write(buffer)
})

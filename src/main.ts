import { systemInfo } from '#src/system'
import stream from '#src/bot/stream'

systemInfo()
await stream.createStream()

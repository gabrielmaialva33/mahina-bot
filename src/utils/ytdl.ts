import ytdl from 'ytdl-core'

/**
 * Get video url from YouTube
 * @param videoUrl
 */
async function getVideoUrl(videoUrl: string) {
  //if (!ytdl.validateURL(videoUrl)) throw new Error('Invalid video url')

  const video = await ytdl.getInfo(videoUrl)
  const videoDetails = video.videoDetails
  if (videoDetails.isLiveContent) {
    // check if the video url is livestream
    const tsFormats = video.formats.filter((format) => format.container === 'ts')
    const highestTsFormat = tsFormats.reduce((prev: any, current: any) => {
      if (!prev || current.bitrate > prev.bitrate) return current

      return prev
    })

    if (highestTsFormat) return highestTsFormat.url
  } else {
    const videoFormats = video.formats
      .filter((format: { hasVideo: any; hasAudio: any }) => format.hasVideo && format.hasAudio)
      .filter((format) => format.container === 'mp4')

    return videoFormats[0].url
  }
}

export { getVideoUrl }

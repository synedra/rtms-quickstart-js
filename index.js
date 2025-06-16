// Import the RTMS SDK
import rtms from "@zoom/rtms";

let clients = new Map();

// Set up webhook event handler to receive RTMS events from Zoom
rtms.onWebhookEvent(({ event, payload }) => {
  const streamId = payload?.rtms_stream_id;

  if (event == "meeting.rtms_stopped") {
      if (!streamId) {
          console.log(`Received meeting.rtms_stopped event without stream ID`);
          return;
      }

      const client = clients.get(streamId);
      if (!client) {
          console.log(`Received meeting.rtms_stopped event for unknown stream ID: ${streamId}`)
          return 
      }

      client.leave();
      clients.delete(streamId);

      return;
  } else if (event !== "meeting.rtms_started") {
    console.log(`Ignoring unknown event`);
    return;
  }

  // Create a new RTMS client for the stream if it doesn't exist
  const client = new rtms.Client();
  clients.set(streamId, client);

  // Configure high-quality audio (16kHz stereo OPUS)
  client.setAudioParams({
    contentType: rtms.AudioContentType.RAW_AUDIO,
    codec: rtms.AudioCodec.OPUS,
    sampleRate: rtms.AudioSampleRate.SR_16K,
    channel: rtms.AudioChannel.STEREO,
    dataOpt: rtms.AudioDataOption.AUDIO_MIXED_STREAM,
    duration: 20,     // 20ms frame duration
    frameSize: 640    // 16kHz * 2 channels * 20ms / 1000 = 640 samples
  });
  
  const video_opts =  {
    contentType: rtms.VideoContentType.RAW_VIDEO,
    codec: rtms.VideoCodec.H264,
    resolution: rtms.VideoResolution.SD,
    dataOpt: rtms.VideoDataOption.VIDEO_SINGLE_ACTIVE_STREAM,
    fps: 30
  }

  // Configure HD video (720p H.264 at 30fps)
  client.setVideoParams(video_opts);
  client.setDeskshareParams(video_opts)

  client.onTranscriptData((data, size, timestamp, metadata) => {
    console.log(`[${timestamp}] -- ${metadata.userName}: ${data}`);
  });

  client.onDeskshareData((data, size, timestamp, metadata) => {
    console.log(`DESKSHARE [${timestamp}]: ${size} bytes from ${metadata.userName}`);
  });

  // Join the meeting using the webhook payload directly
  client.join(payload);
});
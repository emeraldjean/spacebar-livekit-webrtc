# LiveKit Spacebar WebRTC

A WebRTC server implementation compatible with Spacebar using LiveKit for enhanced scalability and features.

## Features

- **LiveKit Integration**: Modern SFU architecture with better scalability than traditional mesh networks
- **Automatic Codec Negotiation**: LiveKit handles codec selection and adaptation automatically
- **Built-in Recording**: Support for recording audio/video sessions
- **Streaming Support**: RTMP/HLS streaming capabilities
- **Cross-platform**: Works on Linux, macOS, and Windows
- **Backward Compatibility**: Maintains the same interface as the original Medooze implementation

## Supported Environments

- Linux
- macOS
- Windows
- Docker containers

## Installation

Install the package in your Spacebar server:

```bash
npm install @spacebarchat/livekit-webrtc --no-save
```

## Configuration

### Environment Variables

Set the following environment variables in your Spacebar `.env` file:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# WebRTC Configuration (for compatibility)
WRTC_LIBRARY=@spacebarchat/livekit-webrtc
WEBRTC_PORT_RANGE=10000-20000
```

### Spacebar Configuration

In your Spacebar `.env` file, configure the server to load this package:

```env
WRTC_LIBRARY=@spacebarchat/livekit-webrtc
```

## LiveKit Server Setup

### Option 1: LiveKit Cloud (Recommended)

1. Sign up at [LiveKit Cloud](https://livekit.io/cloud)
2. Create a new project
3. Get your API key and secret from the dashboard
4. Use the provided WebSocket URL

### Option 2: Self-hosted

1. Deploy LiveKit server using Docker:
```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="your-api-key: your-api-secret" \
  livekit/livekit-server
```

2. Configure your environment variables to point to your server

## Migration from Medooze

This package maintains the same interface as the original Medooze implementation, making migration straightforward:

1. Install the new package
2. Update your environment variables
3. Deploy a LiveKit server
4. Restart your Spacebar server

## API Compatibility

The package implements the same `SignalingDelegate` interface as the original Medooze implementation:

- `start(public_ip, portMin, portMax)`: Initialize the signaling delegate
- `join(roomId, userId, ws, type)`: Join a voice room
- `onOffer(client, sdpOffer, codecs)`: Handle WebRTC offers
- `onClientClose(client)`: Handle client disconnection
- `createRoom(rtcServerId, type)`: Create a new room
- `disposeRoom(rtcServerId)`: Clean up a room

## Room Types

- **guild-voice**: Guild voice channels
- **dm-voice**: Direct message voice calls
- **stream**: Live streaming rooms

## Enhanced Features

### Recording
LiveKit provides built-in recording capabilities that can be enabled per room:

```typescript
// Enable recording for a room
const roomService = new RoomServiceClient(url, apiKey, apiSecret);
await roomService.updateRoomMetadata(roomName, {
  recording: {
    enabled: true,
    format: 'mp4'
  }
});
```

### Streaming
Stream rooms to external platforms:

```typescript
// Start streaming to RTMP
const egressClient = new EgressClient(url, apiKey, apiSecret);
await egressClient.startRoomCompositeEgress(roomName, {
  output: {
    case: 'rtmp',
    value: {
      urls: ['rtmp://your-streaming-server.com/live/stream-key']
    }
  }
});
```

## Troubleshooting

### Connection Issues
- Verify your LiveKit server is running and accessible
- Check that your API credentials are correct
- Ensure firewall allows WebSocket connections (port 7880)

### Audio/Video Issues
- LiveKit handles codec negotiation automatically
- Check browser compatibility for WebRTC features
- Verify microphone/camera permissions

### Performance
- LiveKit's SFU architecture provides better performance than mesh networks
- Monitor server resources and scale as needed
- Use LiveKit Cloud for automatic scaling

## Support

- [LiveKit Documentation](https://docs.livekit.io)
- [Spacebar Discord](https://discord.gg/spacebar)
- [GitHub Issues](https://github.com/spacebarchat/livekit-webrtc/issues)

## License

AGPL-3.0-only
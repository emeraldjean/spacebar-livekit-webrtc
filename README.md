# Spacebar LiveKit WebRTC

A WebRTC server implementation compatible with Spacebar using LiveKit for enhanced scalability and features.

> **⚠️ WORK IN PROGRESS**: This is an experimental, community-maintained fork that is currently under heavy development. The implementation is not yet production-ready and may have bugs, missing features, or breaking changes. We encourage testing and contributions from the community!

> **Note**: This project replaces the original Medooze-based WebRTC implementation with LiveKit integration for improved performance and features.

## Features

- **LiveKit Integration**: Modern SFU architecture with better scalability than traditional mesh networks
- **Server-side Management**: Handles room management, token generation, and signaling coordination
- **Client Direct Connection**: Spacebar clients connect directly to LiveKit (not through our server)
- **Webhook Support**: Handles LiveKit webhooks for real-time updates
- **Cross-platform**: Works on Linux, macOS, and Windows
- **Backward Compatibility**: Maintains the same interface as the original Medooze implementation

## Architecture

This implementation uses a **hybrid architecture**:

1. **Spacebar Server** (this package):
   - Manages rooms via LiveKit Server SDK
   - Generates access tokens for clients
   - Handles signaling coordination
   - Processes LiveKit webhooks

2. **Spacebar Clients**:
   - Connect directly to LiveKit using the provided tokens
   - Handle WebRTC connections through LiveKit's infrastructure
   - No direct connection to our server for media

3. **LiveKit Server**:
   - Handles all WebRTC media processing
   - Manages SFU (Selective Forwarding Unit) functionality
   - Provides recording, streaming, and other advanced features

## Current Status

### ✅ Implemented
- Basic LiveKit integration
- Signaling delegate interface
- WebRTC client management
- Room state management
- Token generation and authentication
- Cross-platform native dependencies

### 🚧 In Progress
- Complete feature parity with Medooze implementation
- Advanced LiveKit features (recording, streaming, etc.)
- Performance optimization
- Error handling improvements
- Documentation completion

### ❓ Planned
- Comprehensive testing suite
- Production-ready error handling
- Advanced configuration options
- Performance monitoring
- Migration guides

## Supported Environments

- Linux
- macOS
- Windows
- Docker containers

## Installation

Install the package in your Spacebar server:

```bash
npm install @emeraldjean/spacebar-livekit-webrtc --no-save
```

### Dependencies

This package only requires the LiveKit Server SDK for server-side operations. No native dependencies are needed as WebRTC processing is handled by the LiveKit server.

## ⚠️ Important: Testing and Feedback Needed

**This implementation is experimental and needs extensive testing!** 

- The code may have bugs or missing features
- Breaking changes may occur between versions
- Not recommended for production use yet
- We need your help to make it stable and feature-complete

**Please test this implementation and report any issues you find!**

## Configuration

### Environment Variables

Set the following environment variables in your Spacebar `.env` file:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# WebRTC Configuration (for compatibility)
WRTC_LIBRARY=@emeraldjean/spacebar-livekit-webrtc
WEBRTC_PORT_RANGE=10000-20000
```

### Spacebar Configuration

In your Spacebar `.env` file, configure the server to load this package:

```env
WRTC_LIBRARY=@emeraldjean/spacebar-livekit-webrtc
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

## Troubleshooting

### Common Issues

If you encounter errors when using the package, try the following:

1. **Clear npm cache and reinstall**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check your Node.js version**: This package requires Node.js 18 or higher

3. **Verify LiveKit server connectivity**: Ensure your LiveKit server is running and accessible

4. **Check environment variables**: Ensure all required LiveKit configuration is set correctly

### Error Types

- **"Cannot find module" errors**: Usually related to missing dependencies or incorrect imports
- **Import/require failures**: Check that all dependencies are installed correctly
- **LiveKit connection errors**: Verify LiveKit server URL and credentials
- **Token generation errors**: Check API key and secret configuration

## Contributing

We welcome contributions from the community! This project is in active development and there are many opportunities to help:

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Test the current implementation** and report any issues
3. **Submit pull requests** for bug fixes or new features
4. **Improve documentation** and examples
5. **Share feedback** and suggestions

### Areas Needing Help

- **Testing**: Help test the implementation with different Spacebar configurations
- **Bug Reports**: Report issues you encounter during testing
- **Feature Development**: Implement missing features or improvements
- **Documentation**: Improve README, code comments, and examples
- **Performance**: Help optimize the implementation
- **Cross-platform Testing**: Test on different operating systems

### Development Setup

```bash
# Clone the repository
git clone https://github.com/emeraldjean/spacebar-livekit-webrtc.git
cd spacebar-livekit-webrtc

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Reporting Issues

When reporting issues, please include:
- Your operating system and Node.js version
- Spacebar version you're testing with
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or logs

## Support

- [LiveKit Documentation](https://docs.livekit.io)
- [Spacebar Discord](https://discord.gg/spacebar)
- [GitHub Issues](https://github.com/emeraldjean/spacebar-livekit-webrtc/issues)

## License

AGPL-3.0-only
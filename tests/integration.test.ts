import { LiveKitSignalingDelegate } from '../src/LiveKitSignalingDelegate';
import { LiveKitWebRtcClient } from '../src/LiveKitWebRtcClient';
import { LiveKitVoiceRoom } from '../src/LiveKitVoiceRoom';

// Mock the dependencies
jest.mock('@livekit/rtc-node');
jest.mock('../src/LiveKitWebRtcClient');
jest.mock('../src/LiveKitVoiceRoom');

describe('LiveKit Integration Tests', () => {
  let delegate: LiveKitSignalingDelegate;
  const mockApiKey = 'test-api-key';
  const mockApiSecret = 'test-api-secret';
  const mockLivekitUrl = 'wss://test.livekit.io';

  beforeEach(() => {
    jest.clearAllMocks();
    delegate = new LiveKitSignalingDelegate(mockApiKey, mockApiSecret, mockLivekitUrl);
    
    // Mock the VoiceRoom constructor
    (LiveKitVoiceRoom as jest.Mock).mockImplementation((id, type, sfu) => ({
      id,
      type,
      clients: new Map(),
      onClientJoin: jest.fn(),
      onClientLeave: jest.fn(),
      getClientById: jest.fn().mockReturnValue(null),
      dispose: jest.fn(),
    }));
  });

  describe('Complete Voice Room Flow', () => {
    it('should handle complete voice room lifecycle', async () => {
      // Start the delegate
      await delegate.start('127.0.0.1', 10000, 20000);
      expect(delegate.ip).toBe('127.0.0.1');

      // Create a room
      delegate.createRoom('test-room', 'guild-voice');
      expect(delegate.rooms.has('test-room')).toBe(true);

      // Join a client
      const mockWs = {};
      const client = await delegate.join('test-room', 'user1', mockWs, 'guild-voice');
      expect(client).toBeInstanceOf(LiveKitWebRtcClient);

      // Verify room has the client
      const room = delegate.rooms.get('test-room');
      expect(room?.clients.has('user1')).toBe(true);

      // Handle offer
      const mockCodecs = [
        { name: 'opus' as const, payload_type: 111, type: 'audio' as const, priority: 1 },
        { name: 'H264' as const, payload_type: 102, rtx_payload_type: 103, type: 'video' as const, priority: 1 },
      ];
      const offerResult = await delegate.onOffer(client, 'mock-sdp-offer', mockCodecs);
      expect(offerResult).toHaveProperty('sdp');
      expect(offerResult).toHaveProperty('selectedVideoCodec');

      // Get clients for room
      const clients = delegate.getClientsForRtcServer('test-room');
      expect(clients.size).toBe(1);
      expect(clients.has(client)).toBe(true);

      // Close client
      delegate.onClientClose(client);
      expect(room?.clients.has('user1')).toBe(false);

      // Dispose room
      delegate.disposeRoom('test-room');
      expect(delegate.rooms.has('test-room')).toBe(false);
    });

    it('should handle multiple clients in same room', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);
      delegate.createRoom('multi-client-room', 'guild-voice');

      // Join multiple clients
      const client1 = await delegate.join('multi-client-room', 'user1', {}, 'guild-voice');
      const client2 = await delegate.join('multi-client-room', 'user2', {}, 'guild-voice');

      const room = delegate.rooms.get('multi-client-room');
      expect(room?.clients.size).toBe(2);
      expect(room?.clients.has('user1')).toBe(true);
      expect(room?.clients.has('user2')).toBe(true);

      // Get all clients
      const clients = delegate.getClientsForRtcServer('multi-client-room');
      expect(clients.size).toBe(2);
      expect(clients.has(client1)).toBe(true);
      expect(clients.has(client2)).toBe(true);
    });

    it('should handle different room types', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);

      // Create different room types
      delegate.createRoom('guild-room', 'guild-voice');
      delegate.createRoom('dm-room', 'dm-voice');
      delegate.createRoom('stream-room', 'stream');

      expect(delegate.rooms.size).toBe(3);
      expect(delegate.rooms.get('guild-room')?.type).toBe('guild-voice');
      expect(delegate.rooms.get('dm-room')?.type).toBe('dm-voice');
      expect(delegate.rooms.get('stream-room')?.type).toBe('stream');
    });

    it('should handle client reconnection in voice rooms', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);
      delegate.createRoom('reconnect-room', 'guild-voice');

      // Mock existing client
      const mockExistingClient = {
        user_id: 'user1',
        voiceRoomId: 'reconnect-room',
      };
      const mockRoom = {
        getClientById: jest.fn().mockReturnValue(mockExistingClient),
        onClientJoin: jest.fn(),
      };
      delegate.rooms.set('reconnect-room', mockRoom as any);
      delegate.onClientClose = jest.fn();

      // Join same user again (should disconnect existing)
      const newClient = await delegate.join('reconnect-room', 'user1', {}, 'guild-voice');
      
      expect(delegate.onClientClose).toHaveBeenCalledWith(mockExistingClient);
      expect(newClient).toBeInstanceOf(LiveKitWebRtcClient);
    });

    it('should not disconnect existing client in stream rooms', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);
      delegate.createRoom('stream-room', 'stream');

      // Mock existing client
      const mockExistingClient = {
        user_id: 'user1',
        voiceRoomId: 'stream-room',
      };
      const mockRoom = {
        getClientById: jest.fn().mockReturnValue(mockExistingClient),
        onClientJoin: jest.fn(),
      };
      delegate.rooms.set('stream-room', mockRoom as any);
      delegate.onClientClose = jest.fn();

      // Join same user again (should NOT disconnect existing in stream)
      const newClient = await delegate.join('stream-room', 'user1', {}, 'stream');
      
      expect(delegate.onClientClose).not.toHaveBeenCalled();
      expect(newClient).toBeInstanceOf(LiveKitWebRtcClient);
    });
  });

  describe('Error Handling', () => {
    it('should handle room not found in onOffer', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);
      
      const mockClient = {
        voiceRoomId: 'nonexistent-room',
        user_id: 'user1',
      };
      const mockCodecs = [{ name: 'opus' as const, payload_type: 111, type: 'audio' as const, priority: 1 }];

      await expect(delegate.onOffer(mockClient as any, 'mock-sdp-offer', mockCodecs))
        .rejects.toThrow('Room not found');
    });

    it('should handle missing API credentials', () => {
      const originalEnv = process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_KEY;
      
      expect(() => new LiveKitSignalingDelegate()).toThrow('LiveKit API key and secret are required');
      
      process.env.LIVEKIT_API_KEY = originalEnv;
    });
  });

  describe('Stop and Cleanup', () => {
    it('should clean up all rooms on stop', async () => {
      await delegate.start('127.0.0.1', 10000, 20000);
      
      // Create multiple rooms
      delegate.createRoom('room1', 'guild-voice');
      delegate.createRoom('room2', 'dm-voice');
      delegate.createRoom('room3', 'stream');

      expect(delegate.rooms.size).toBe(3);

      // Stop delegate
      await delegate.stop();
      
      expect(delegate.rooms.size).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use environment variables when credentials not provided', () => {
      const envDelegate = new LiveKitSignalingDelegate();
      expect(envDelegate.apiKey).toBe(process.env.LIVEKIT_API_KEY);
      expect(envDelegate.apiSecret).toBe(process.env.LIVEKIT_API_SECRET);
      expect(envDelegate.livekitUrl).toBe(process.env.LIVEKIT_URL);
    });

    it('should use provided credentials over environment variables', () => {
      const customDelegate = new LiveKitSignalingDelegate('custom-key', 'custom-secret', 'wss://custom.livekit.io');
      expect(customDelegate.apiKey).toBe('custom-key');
      expect(customDelegate.apiSecret).toBe('custom-secret');
      expect(customDelegate.livekitUrl).toBe('wss://custom.livekit.io');
    });
  });
});

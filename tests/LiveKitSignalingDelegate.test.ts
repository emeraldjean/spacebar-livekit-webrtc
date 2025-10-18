import { LiveKitSignalingDelegate } from '../src/LiveKitSignalingDelegate';
import { LiveKitWebRtcClient } from '../src/LiveKitWebRtcClient';
import { LiveKitVoiceRoom } from '../src/LiveKitVoiceRoom';

// Mock the dependencies
jest.mock('../src/LiveKitWebRtcClient');
jest.mock('../src/LiveKitVoiceRoom');

describe('LiveKitSignalingDelegate', () => {
  let delegate: LiveKitSignalingDelegate;
  const mockApiKey = 'test-api-key';
  const mockApiSecret = 'test-api-secret';
  const mockLivekitUrl = 'wss://test.livekit.io';

  beforeEach(() => {
    jest.clearAllMocks();
    delegate = new LiveKitSignalingDelegate(mockApiKey, mockApiSecret, mockLivekitUrl);
  });

  describe('constructor', () => {
    it('should initialize with provided credentials', () => {
      expect(delegate.apiKey).toBe(mockApiKey);
      expect(delegate.apiSecret).toBe(mockApiSecret);
      expect(delegate.livekitUrl).toBe(mockLivekitUrl);
    });

    it('should use environment variables when credentials not provided', () => {
      const envDelegate = new LiveKitSignalingDelegate();
      expect(envDelegate.apiKey).toBe(process.env.LIVEKIT_API_KEY);
      expect(envDelegate.apiSecret).toBe(process.env.LIVEKIT_API_SECRET);
      expect(envDelegate.livekitUrl).toBe(process.env.LIVEKIT_URL);
    });

    it('should throw error when API credentials are missing', () => {
      const originalEnv = process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_KEY;
      
      expect(() => new LiveKitSignalingDelegate()).toThrow('LiveKit API key and secret are required');
      
      process.env.LIVEKIT_API_KEY = originalEnv;
    });
  });

  describe('start', () => {
    it('should initialize successfully', async () => {
      await expect(delegate.start('127.0.0.1', 10000, 20000)).resolves.toBeUndefined();
      expect(delegate.ip).toBe('127.0.0.1');
      expect(delegate.port).toBe(10000);
    });

    it('should use default port when not provided', async () => {
      await delegate.start('127.0.0.1', 0, 0);
      expect(delegate.port).toBe(7880);
    });
  });

  describe('join', () => {
    const mockWs = {};
    const mockUserId = 'user123';
    const mockRoomId = 'room123';

    beforeEach(() => {
      // Mock the VoiceRoom constructor
      (LiveKitVoiceRoom as jest.Mock).mockImplementation(() => ({
        onClientJoin: jest.fn(),
        getClientById: jest.fn().mockReturnValue(null),
        clients: new Map(),
        type: 'guild-voice',
      }));
    });

    it('should create a new room if it does not exist', async () => {
      const client = await delegate.join(mockRoomId, mockUserId, mockWs, 'guild-voice');
      
      expect(delegate.rooms.has(mockRoomId)).toBe(true);
      expect(LiveKitWebRtcClient).toHaveBeenCalledWith(
        mockUserId,
        mockRoomId,
        mockWs,
        expect.objectContaining({
          onClientJoin: expect.any(Function),
          getClientById: expect.any(Function),
        }),
        mockApiKey,
        mockApiSecret,
        mockLivekitUrl
      );
      expect(client).toBeInstanceOf(LiveKitWebRtcClient);
    });

    it('should disconnect existing client in voice room', async () => {
      const mockExistingClient = {
        user_id: mockUserId,
        voiceRoomId: 'existing-room',
      };
      
      const mockRoom = {
        getClientById: jest.fn().mockReturnValue(mockExistingClient),
        onClientJoin: jest.fn(),
      };
      
      delegate.rooms.set('existing-room', mockRoom as any);
      delegate.onClientClose = jest.fn();

      await delegate.join('existing-room', mockUserId, mockWs, 'guild-voice');
      
      expect(delegate.onClientClose).toHaveBeenCalledWith(mockExistingClient);
    });

    it('should not disconnect existing client in stream room', async () => {
      const mockExistingClient = {
        user_id: mockUserId,
        voiceRoomId: 'existing-room',
      };
      
      const mockRoom = {
        getClientById: jest.fn().mockReturnValue(mockExistingClient),
        onClientJoin: jest.fn(),
      };
      
      delegate.rooms.set('existing-room', mockRoom as any);
      delegate.onClientClose = jest.fn();

      await delegate.join('existing-room', mockUserId, mockWs, 'stream');
      
      expect(delegate.onClientClose).not.toHaveBeenCalled();
    });
  });

  describe('onOffer', () => {
    const mockClient = {
      voiceRoomId: 'room123',
      user_id: 'user123',
    };
    const mockCodecs = [
      { name: 'opus' as const, payload_type: 111, type: 'audio' as const, priority: 1 },
      { name: 'H264' as const, payload_type: 102, rtx_payload_type: 103, type: 'video' as const, priority: 1 },
    ];

    beforeEach(() => {
      const mockRoom = {
        onClientJoin: jest.fn(),
        getClientById: jest.fn().mockReturnValue(null),
      };
      delegate.rooms.set('room123', mockRoom as any);
    });

    it('should generate LiveKit token and return mock SDP', async () => {
      const result = await delegate.onOffer(mockClient as any, 'mock-sdp-offer', mockCodecs);
      
      expect(result).toHaveProperty('sdp');
      expect(result).toHaveProperty('selectedVideoCodec');
      expect(result.selectedVideoCodec).toBe('H264');
      expect(result.sdp).toContain('LiveKit Session');
      expect(result.sdp).toContain('livekit-token:');
    });

    it('should throw error when room not found', async () => {
      const clientWithoutRoom = { voiceRoomId: 'nonexistent-room', user_id: 'user123' };
      
      await expect(delegate.onOffer(clientWithoutRoom as any, 'mock-sdp-offer', mockCodecs))
        .rejects.toThrow('Room not found');
    });

    it('should use default video codec when H264 not found', async () => {
      const codecsWithoutH264 = [{ name: 'opus' as const, payload_type: 111, type: 'audio' as const, priority: 1 }];
      
      const result = await delegate.onOffer(mockClient as any, 'mock-sdp-offer', codecsWithoutH264);
      
      expect(result.selectedVideoCodec).toBe('H264');
    });
  });

  describe('createRoom', () => {
    it('should create a new room', () => {
      delegate.createRoom('room123', 'guild-voice');
      
      expect(delegate.rooms.has('room123')).toBe(true);
      expect(LiveKitVoiceRoom).toHaveBeenCalledWith('room123', 'guild-voice', delegate);
    });
  });

  describe('disposeRoom', () => {
    it('should dispose room and remove from rooms map', () => {
      const mockRoom = {
        dispose: jest.fn(),
      };
      delegate.rooms.set('room123', mockRoom as any);
      
      delegate.disposeRoom('room123');
      
      expect(mockRoom.dispose).toHaveBeenCalled();
      expect(delegate.rooms.has('room123')).toBe(false);
    });
  });

  describe('getClientsForRtcServer', () => {
    it('should return empty set for non-existent room', () => {
      const clients = delegate.getClientsForRtcServer('nonexistent-room');
      expect(clients.size).toBe(0);
    });

    it('should return clients for existing room', () => {
      const mockClient1 = { 
        user_id: 'user1',
        websocket: {},
        voiceRoomId: 'room123',
        webrtcConnected: false,
        emitter: {},
      };
      const mockClient2 = { 
        user_id: 'user2',
        websocket: {},
        voiceRoomId: 'room123',
        webrtcConnected: false,
        emitter: {},
      };
      const mockRoom = {
        clients: new Map([
          ['user1', mockClient1],
          ['user2', mockClient2],
        ]),
      };
      delegate.rooms.set('room123', mockRoom as any);
      
      const clients = delegate.getClientsForRtcServer('room123');
      expect(clients.size).toBe(2);
      expect(clients.has(mockClient1 as any)).toBe(true);
      expect(clients.has(mockClient2 as any)).toBe(true);
    });
  });

  describe('stop', () => {
    it('should dispose all rooms and clear rooms map', async () => {
      const mockRoom1 = { dispose: jest.fn() };
      const mockRoom2 = { dispose: jest.fn() };
      delegate.rooms.set('room1', mockRoom1 as any);
      delegate.rooms.set('room2', mockRoom2 as any);
      
      await delegate.stop();
      
      expect(mockRoom1.dispose).toHaveBeenCalled();
      expect(mockRoom2.dispose).toHaveBeenCalled();
      expect(delegate.rooms.size).toBe(0);
    });
  });
});

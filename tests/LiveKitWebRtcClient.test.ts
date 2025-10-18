import { LiveKitWebRtcClient } from '../src/LiveKitWebRtcClient';
import { LiveKitVoiceRoom } from '../src/LiveKitVoiceRoom';
import { Room, RoomEvent, TrackKind } from '@livekit/rtc-node';

// Mock the dependencies
jest.mock('@livekit/rtc-node');
jest.mock('../src/LiveKitVoiceRoom');

describe('LiveKitWebRtcClient', () => {
  let client: LiveKitWebRtcClient;
  let mockRoom: jest.Mocked<LiveKitVoiceRoom>;
  let mockLivekitRoom: jest.Mocked<Room>;
  const mockUserId = 'user123';
  const mockRoomId = 'room123';
  const mockWs = {};
  const mockApiKey = 'test-api-key';
  const mockApiSecret = 'test-api-secret';
  const mockLivekitUrl = 'wss://test.livekit.io';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock LiveKit Room
    mockLivekitRoom = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      localParticipant: {
        trackPublications: new Map(),
        publishTrack: jest.fn().mockResolvedValue({ waitForSubscription: jest.fn() }),
        unpublishTrack: jest.fn().mockResolvedValue(undefined),
      },
      remoteParticipants: new Map(),
      on: jest.fn().mockReturnThis(),
    } as any;

    (Room as jest.Mock).mockImplementation(() => mockLivekitRoom);

    // Mock VoiceRoom
    mockRoom = {
      onClientJoin: jest.fn(),
      onClientLeave: jest.fn(),
      getClientById: jest.fn(),
    } as any;

    client = new LiveKitWebRtcClient(
      mockUserId,
      mockRoomId,
      mockWs,
      mockRoom,
      mockApiKey,
      mockApiSecret,
      mockLivekitUrl
    );
  });

  describe('constructor', () => {
    it('should initialize with provided parameters', () => {
      expect(client.user_id).toBe(mockUserId);
      expect(client.voiceRoomId).toBe(mockRoomId);
      expect(client.websocket).toBe(mockWs);
      expect(client.room).toBe(mockRoom);
      expect(client.webrtcConnected).toBe(false);
      expect(client.isStopped).toBe(false);
    });
  });

  describe('connectToLiveKit', () => {
    it('should connect to LiveKit room with token', async () => {
      const mockToken = 'mock-jwt-token';
      
      await client.connectToLiveKit(mockToken);
      
      expect(Room).toHaveBeenCalled();
      expect(mockLivekitRoom.connect).toHaveBeenCalledWith(
        mockLivekitUrl,
        mockToken,
        { autoSubscribe: true, dynacast: true }
      );
      expect(mockLivekitRoom.on).toHaveBeenCalledWith(RoomEvent.Connected, expect.any(Function));
      expect(mockLivekitRoom.on).toHaveBeenCalledWith(RoomEvent.Disconnected, expect.any(Function));
    });

    it('should disconnect existing room before connecting', async () => {
      client['_livekitRoom'] = mockLivekitRoom;
      
      await client.connectToLiveKit('mock-token');
      
      expect(mockLivekitRoom.disconnect).toHaveBeenCalled();
    });

    it('should throw error on connection failure', async () => {
      const connectionError = new Error('Connection failed');
      mockLivekitRoom.connect.mockRejectedValue(connectionError);
      
      await expect(client.connectToLiveKit('mock-token')).rejects.toThrow('Connection failed');
    });
  });

  describe('isProducingAudio', () => {
    it('should return false when not connected', () => {
      expect(client.isProducingAudio()).toBe(false);
    });

    it('should return false when no LiveKit room', () => {
      client.webrtcConnected = true;
      expect(client.isProducingAudio()).toBe(false);
    });

    it('should return true when audio track is published', () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO };
      const mockPublication = { track: mockAudioTrack };
      if (mockLivekitRoom.localParticipant) {
        if (mockLivekitRoom.localParticipant) {
        mockLivekitRoom.localParticipant.trackPublications.set('audio-track', mockPublication as any);
      }
      }
      
      expect(client.isProducingAudio()).toBe(true);
    });

    it('should return false when no audio track is published', () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockVideoTrack = { kind: TrackKind.KIND_VIDEO };
      const mockPublication = { track: mockVideoTrack };
      if (mockLivekitRoom.localParticipant) {
        mockLivekitRoom.localParticipant.trackPublications.set('video-track', mockPublication as any);
      }
      
      expect(client.isProducingAudio()).toBe(false);
    });
  });

  describe('isProducingVideo', () => {
    it('should return false when not connected', () => {
      expect(client.isProducingVideo()).toBe(false);
    });

    it('should return true when video track is published', () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockVideoTrack = { kind: TrackKind.KIND_VIDEO };
      const mockPublication = { track: mockVideoTrack };
      if (mockLivekitRoom.localParticipant) {
        mockLivekitRoom.localParticipant.trackPublications.set('video-track', mockPublication as any);
      }
      
      expect(client.isProducingVideo()).toBe(true);
    });
  });

  describe('isSubscribedToTrack', () => {
    const targetUserId = 'target-user';

    beforeEach(() => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
    });

    it('should return false when not connected', () => {
      client.webrtcConnected = false;
      expect(client.isSubscribedToTrack(targetUserId, 'audio')).toBe(false);
    });

    it('should return false when participant not found', () => {
      expect(client.isSubscribedToTrack(targetUserId, 'audio')).toBe(false);
    });

    it('should return true when subscribed to audio track', () => {
      const mockParticipant = {
        identity: targetUserId,
        trackPublications: new Map(),
      };
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO };
      const mockPublication = { track: mockAudioTrack, subscribed: true };
      mockParticipant.trackPublications.set('audio-track', mockPublication as any);
      mockLivekitRoom.remoteParticipants.set(targetUserId, mockParticipant as any);
      
      expect(client.isSubscribedToTrack(targetUserId, 'audio')).toBe(true);
    });

    it('should return false when not subscribed to track', () => {
      const mockParticipant = {
        identity: targetUserId,
        trackPublications: new Map(),
      };
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO };
      const mockPublication = { track: mockAudioTrack, subscribed: false };
      mockParticipant.trackPublications.set('audio-track', mockPublication as any);
      mockLivekitRoom.remoteParticipants.set(targetUserId, mockParticipant as any);
      
      expect(client.isSubscribedToTrack(targetUserId, 'audio')).toBe(false);
    });
  });

  describe('publishTrack', () => {
    const mockSSRCs = { audio_ssrc: 12345, video_ssrc: 54321, rtx_ssrc: 67890 };

    it('should log warning when not connected', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      await client.publishTrack('audio', mockSSRCs);
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot publish track - not connected to LiveKit');
    });

    it('should log track publishing when connected', async () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      const consoleSpy = jest.spyOn(console, 'log');
      
      await client.publishTrack('audio', mockSSRCs);
      
      expect(consoleSpy).toHaveBeenCalledWith('Publishing audio track with SSRC:', mockSSRCs);
    });
  });

  describe('stopPublishingTrack', () => {
    it('should return early when not connected', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      client.stopPublishingTrack('audio');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should unpublish audio track when connected', () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO, sid: 'audio-track-sid' };
      const mockPublication = { track: mockAudioTrack };
      if (mockLivekitRoom.localParticipant) {
        mockLivekitRoom.localParticipant.trackPublications.set('audio-track', mockPublication as any);
      }
      
      client.stopPublishingTrack('audio');
      
      if (mockLivekitRoom.localParticipant) {
        expect(mockLivekitRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith('audio-track-sid');
      }
    });
  });

  describe('subscribeToTrack', () => {
    const targetUserId = 'target-user';

    it('should log warning when not connected', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      await client.subscribeToTrack(targetUserId, 'audio');
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot subscribe to track - not connected to LiveKit');
    });

    it('should log error when participant not found', async () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      const consoleSpy = jest.spyOn(console, 'error');
      
      await client.subscribeToTrack(targetUserId, 'audio');
      
      expect(consoleSpy).toHaveBeenCalledWith(`Participant ${targetUserId} not found`);
    });

    it('should subscribe to audio track when participant found', async () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockParticipant = {
        identity: targetUserId,
        trackPublications: new Map(),
      };
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO };
      const mockPublication = { 
        track: mockAudioTrack, 
        subscribed: false,
        setSubscribed: jest.fn().mockResolvedValue(undefined)
      };
      mockParticipant.trackPublications.set('audio-track', mockPublication as any);
      mockLivekitRoom.remoteParticipants.set(targetUserId, mockParticipant as any);
      
      await client.subscribeToTrack(targetUserId, 'audio');
      
      expect(mockPublication.setSubscribed).toHaveBeenCalledWith(true);
    });
  });

  describe('unSubscribeFromTrack', () => {
    const targetUserId = 'target-user';

    it('should return early when not connected', () => {
      client.unSubscribeFromTrack(targetUserId, 'audio');
      // Should not throw or log anything
    });

    it('should unsubscribe from track when connected', () => {
      client.webrtcConnected = true;
      client['_livekitRoom'] = mockLivekitRoom;
      
      const mockParticipant = {
        identity: targetUserId,
        trackPublications: new Map(),
      };
      const mockAudioTrack = { kind: TrackKind.KIND_AUDIO };
      const mockPublication = { 
        track: mockAudioTrack, 
        subscribed: true,
        setSubscribed: jest.fn()
      };
      mockParticipant.trackPublications.set('audio-track', mockPublication as any);
      mockLivekitRoom.remoteParticipants.set(targetUserId, mockParticipant as any);
      
      client.unSubscribeFromTrack(targetUserId, 'audio');
      
      expect(mockPublication.setSubscribed).toHaveBeenCalledWith(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from LiveKit room', async () => {
      client['_livekitRoom'] = mockLivekitRoom;
      
      await client.disconnect();
      
      expect(mockLivekitRoom.disconnect).toHaveBeenCalled();
      expect(client.webrtcConnected).toBe(false);
      expect(client['_isConnected']).toBe(false);
    });

    it('should handle case when no LiveKit room exists', async () => {
      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('getIncomingStreamSSRCs', () => {
    it('should return zero SSRCs when not connected', () => {
      const result = client.getIncomingStreamSSRCs();
      expect(result).toEqual({ audio_ssrc: 0, video_ssrc: 0, rtx_ssrc: 0 });
    });

    it('should return stored SSRCs when connected', () => {
      const mockSSRCs = { audio_ssrc: 12345, video_ssrc: 54321, rtx_ssrc: 67890 };
      client.incomingSSRCS = mockSSRCs;
      client.webrtcConnected = true;
      
      const result = client.getIncomingStreamSSRCs();
      expect(result).toEqual(mockSSRCs);
    });
  });

  describe('getOutgoingStreamSSRCsForUser', () => {
    it('should return zero SSRCs (LiveKit handles this internally)', () => {
      const result = client.getOutgoingStreamSSRCsForUser('any-user');
      expect(result).toEqual({ audio_ssrc: 0, video_ssrc: 0, rtx_ssrc: 0 });
    });
  });
});

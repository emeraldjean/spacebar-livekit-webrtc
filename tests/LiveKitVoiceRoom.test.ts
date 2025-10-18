import { LiveKitVoiceRoom } from '../src/LiveKitVoiceRoom';
import { LiveKitSignalingDelegate } from '../src/LiveKitSignalingDelegate';
import { LiveKitWebRtcClient } from '../src/LiveKitWebRtcClient';

// Mock the dependencies
jest.mock('../src/LiveKitSignalingDelegate');
jest.mock('../src/LiveKitWebRtcClient');

describe('LiveKitVoiceRoom', () => {
  let room: LiveKitVoiceRoom;
  let mockSfu: jest.Mocked<LiveKitSignalingDelegate>;
  const mockRoomId = 'room123';
  const mockType = 'guild-voice';

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSfu = {
      rooms: new Map(),
    } as any;

    room = new LiveKitVoiceRoom(mockRoomId, mockType, mockSfu);
  });

  describe('constructor', () => {
    it('should initialize with provided parameters', () => {
      expect(room.id).toBe(mockRoomId);
      expect(room.type).toBe(mockType);
      expect(room.clients.size).toBe(0);
    });
  });

  describe('onClientJoin', () => {
    it('should add client to clients map', () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
      } as any;

      const consoleSpy = jest.spyOn(console, 'log');
      
      room.onClientJoin(mockClient);
      
      expect(room.clients.has('user123')).toBe(true);
      expect(room.clients.get('user123')).toBe(mockClient);
      expect(consoleSpy).toHaveBeenCalledWith(`Client user123 joining room ${mockRoomId}`);
    });
  });

  describe('onClientOffer', () => {
    it('should connect client to LiveKit with token', async () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
        connectToLiveKit: jest.fn().mockResolvedValue(undefined),
      } as any;
      const mockToken = 'mock-jwt-token';
      const consoleSpy = jest.spyOn(console, 'log');
      
      await room.onClientOffer(mockClient, mockToken);
      
      expect(mockClient.connectToLiveKit).toHaveBeenCalledWith(mockToken);
      expect(consoleSpy).toHaveBeenCalledWith(`Client user123 offering connection to room ${mockRoomId}`);
      expect(consoleSpy).toHaveBeenCalledWith(`Client user123 connected to LiveKit room`);
    });

    it('should handle connection failure', async () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
        connectToLiveKit: jest.fn().mockRejectedValue(new Error('Connection failed')),
      } as any;
      const mockToken = 'mock-jwt-token';
      const consoleSpy = jest.spyOn(console, 'error');
      
      await expect(room.onClientOffer(mockClient, mockToken)).rejects.toThrow('Connection failed');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to connect client user123 to LiveKit:', expect.any(Error));
    });
  });

  describe('onClientLeave', () => {
    it('should remove client from clients map and disconnect', () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
        isStopped: false,
        disconnect: jest.fn().mockResolvedValue(undefined),
      } as any;
      
      room.clients.set('user123', mockClient);
      const consoleSpy = jest.spyOn(console, 'log');
      
      room.onClientLeave(mockClient);
      
      expect(room.clients.has('user123')).toBe(false);
      expect(mockClient.isStopped).toBe(true);
      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`Client user123 leaving room ${mockRoomId}`);
    });

    it('should not disconnect if client already stopped', () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
        isStopped: true,
        disconnect: jest.fn(),
      } as any;
      
      room.clients.set('user123', mockClient);
      
      room.onClientLeave(mockClient);
      
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('getClientById', () => {
    it('should return client if found', () => {
      const mockClient = {
        user_id: 'user123',
        voiceRoomId: mockRoomId,
      } as any;
      
      room.clients.set('user123', mockClient);
      
      expect(room.getClientById('user123')).toBe(mockClient);
    });

    it('should return undefined if client not found', () => {
      expect(room.getClientById('nonexistent-user')).toBeUndefined();
    });
  });

  describe('getParticipantCount', () => {
    it('should return number of clients', () => {
      expect(room.getParticipantCount()).toBe(0);
      
      room.clients.set('user1', {} as any);
      room.clients.set('user2', {} as any);
      
      expect(room.getParticipantCount()).toBe(2);
    });
  });

  describe('getConnectedClients', () => {
    it('should return only connected clients', () => {
      const connectedClient = {
        user_id: 'user1',
        isConnected: true,
      } as any;
      const disconnectedClient = {
        user_id: 'user2',
        isConnected: false,
      } as any;
      
      room.clients.set('user1', connectedClient);
      room.clients.set('user2', disconnectedClient);
      
      const connectedClients = room.getConnectedClients();
      
      expect(connectedClients).toHaveLength(1);
      expect(connectedClients[0]).toBe(connectedClient);
    });
  });

  describe('dispose', () => {
    it('should disconnect all clients and clear clients map', () => {
      const mockClient1 = {
        user_id: 'user1',
        disconnect: jest.fn().mockResolvedValue(undefined),
      } as any;
      const mockClient2 = {
        user_id: 'user2',
        disconnect: jest.fn().mockResolvedValue(undefined),
      } as any;
      
      room.clients.set('user1', mockClient1);
      room.clients.set('user2', mockClient2);
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      room.dispose();
      
      expect(mockClient1.disconnect).toHaveBeenCalled();
      expect(mockClient2.disconnect).toHaveBeenCalled();
      expect(room.clients?.size ?? 0).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(`Disposing room ${mockRoomId}`);
    });

    it('should handle empty clients map', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      room.dispose();
      
      expect(room.clients?.size ?? 0).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(`Disposing room ${mockRoomId}`);
    });
  });
});

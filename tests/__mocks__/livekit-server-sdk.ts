// Mock for livekit-server-sdk
export const RoomServiceClient = jest.fn().mockImplementation(() => ({
  listRooms: jest.fn().mockResolvedValue([]),
  createRoom: jest.fn().mockResolvedValue({ name: 'test-room' }),
  deleteRoom: jest.fn().mockResolvedValue(undefined),
}));

export const AccessToken = jest.fn().mockImplementation(() => ({
  addGrant: jest.fn().mockReturnThis(),
  toJwt: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

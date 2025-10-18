// Mock for @livekit/rtc-node
export const TrackKind = {
  KIND_UNKNOWN: 0,
  KIND_AUDIO: 1,
  KIND_VIDEO: 2,
};

export const RoomEvent = {
  Connected: 'connected',
  Disconnected: 'disconnected',
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  LocalTrackPublished: 'localTrackPublished',
  LocalTrackUnpublished: 'localTrackUnpublished',
  ParticipantConnected: 'participantConnected',
  ParticipantDisconnected: 'participantDisconnected',
};

export const Room = jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  localParticipant: {
    trackPublications: new Map(),
    publishTrack: jest.fn().mockResolvedValue({ waitForSubscription: jest.fn() }),
    unpublishTrack: jest.fn().mockResolvedValue(undefined),
  },
  remoteParticipants: new Map(),
  on: jest.fn().mockReturnThis(),
}));

export const LocalParticipant = jest.fn();
export const RemoteParticipant = jest.fn();
export const Track = jest.fn();
export const TrackPublication = jest.fn();
export const LocalTrack = jest.fn();
export const RemoteTrack = jest.fn();

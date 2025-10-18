import type { ClientEmitter, SSRCs, WebRtcClient } from "@spacebarchat/spacebar-webrtc-types";
import { Room, RoomEvent, LocalParticipant, RemoteParticipant, Track, TrackPublication, LocalTrack, RemoteTrack, TrackKind } from "@livekit/rtc-node";
import { LiveKitVoiceRoom } from "./LiveKitVoiceRoom";
import { EventEmitter } from "events";

export class LiveKitWebRtcClient implements WebRtcClient<any> {
	websocket: any;
	user_id: string;
	voiceRoomId: string;
	webrtcConnected: boolean;
	emitter: ClientEmitter;
	public room?: LiveKitVoiceRoom;
	public isStopped?: boolean;
	public incomingSSRCS?: SSRCs;
	
	private _livekitRoom?: Room;
	private _apiKey: string;
	private _apiSecret: string;
	private _livekitUrl: string;
	private _isConnected: boolean = false;

	constructor(
		userId: string,
		roomId: string,
		websocket: any,
		room: LiveKitVoiceRoom,
		apiKey: string,
		apiSecret: string,
		livekitUrl: string,
	) {
		this.user_id = userId;
		this.voiceRoomId = roomId;
		this.websocket = websocket;
		this.room = room;
		this.webrtcConnected = false;
		this.isStopped = false;
		this.emitter = new EventEmitter();
		this._apiKey = apiKey;
		this._apiSecret = apiSecret;
		this._livekitUrl = livekitUrl;
	}

	public async connectToLiveKit(token: string): Promise<void> {
		if (this._livekitRoom) {
			await this._livekitRoom.disconnect();
		}

		this._livekitRoom = new Room();
		
		// Set up event listeners
		this._livekitRoom
			.on(RoomEvent.Connected, this.handleConnected.bind(this))
			.on(RoomEvent.Disconnected, this.handleDisconnected.bind(this))
			.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this))
			.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this))
			.on(RoomEvent.LocalTrackPublished, this.handleLocalTrackPublished.bind(this))
			.on(RoomEvent.LocalTrackUnpublished, this.handleLocalTrackUnpublished.bind(this))
			.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this))
			.on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));

		try {
			await this._livekitRoom.connect(this._livekitUrl, token, {
				autoSubscribe: true,
				dynacast: true,
			});
		} catch (error) {
			console.error("Failed to connect to LiveKit:", error);
			throw error;
		}
	}

	private handleConnected() {
		console.log("Connected to LiveKit room");
		this.webrtcConnected = true;
		this._isConnected = true;
		this.emitter.emit("connected");
	}

	private handleDisconnected() {
		console.log("Disconnected from LiveKit room");
		this.webrtcConnected = false;
		this._isConnected = false;
		this.emitter.emit("disconnected");
	}

	private handleTrackSubscribed(track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) {
		console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
		// Handle track subscription logic here
	}

	private handleTrackUnsubscribed(track: RemoteTrack, publication: TrackPublication, participant: RemoteParticipant) {
		console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
		// Handle track unsubscription logic here
	}

	private handleLocalTrackPublished(publication: TrackPublication) {
		console.log(`Local track published: ${publication.track?.kind}`);
		// Handle local track publication logic here
	}

	private handleLocalTrackUnpublished(publication: TrackPublication) {
		console.log(`Local track unpublished: ${publication.track?.kind}`);
		// Handle local track unpublication logic here
	}

	private handleParticipantConnected(participant: RemoteParticipant) {
		console.log(`Participant connected: ${participant.identity}`);
		// Handle participant connection logic here
	}

	private handleParticipantDisconnected(participant: RemoteParticipant) {
		console.log(`Participant disconnected: ${participant.identity}`);
		// Handle participant disconnection logic here
	}

	public isProducingAudio(): boolean {
		if (!this.webrtcConnected || !this._livekitRoom) return false;
		
		const localParticipant = this._livekitRoom.localParticipant;
		if (!localParticipant) return false;

		// Check if any audio track is published
		for (const publication of localParticipant.trackPublications.values()) {
			if (publication.track && publication.track.kind === TrackKind.KIND_AUDIO) return true;
		}
		return false;
	}

	public isProducingVideo(): boolean {
		if (!this.webrtcConnected || !this._livekitRoom) return false;
		
		const localParticipant = this._livekitRoom.localParticipant;
		if (!localParticipant) return false;

		// Check if any video track is published
		for (const publication of localParticipant.trackPublications.values()) {
			if (publication.track && publication.track.kind === TrackKind.KIND_VIDEO) return true;
		}
		return false;
	}

	public isSubscribedToTrack(user_id: string, type: "audio" | "video"): boolean {
		if (!this.webrtcConnected || !this._livekitRoom) return false;

		// Find the participant by identity
		const participant = Array.from(this._livekitRoom.remoteParticipants.values())
			.find(p => p.identity === user_id);

		if (!participant) return false;

		// Check if we're subscribed to their track
		const trackKind = type === "audio" ? TrackKind.KIND_AUDIO : TrackKind.KIND_VIDEO;
		for (const publication of participant.trackPublications.values()) {
			if (publication.track && publication.track.kind === trackKind && publication.subscribed) {
				return true;
			}
		}
		return false;
	}

	public initIncomingSSRCs(ssrcs: SSRCs): void {
		this.incomingSSRCS = ssrcs;
	}

	public getIncomingStreamSSRCs(): SSRCs {
		if (!this.webrtcConnected || !this.incomingSSRCS) {
			return { audio_ssrc: 0, video_ssrc: 0, rtx_ssrc: 0 };
		}

		return {
			audio_ssrc: this.incomingSSRCS.audio_ssrc || 0,
			video_ssrc: this.incomingSSRCS.video_ssrc || 0,
			rtx_ssrc: this.incomingSSRCS.rtx_ssrc || 0,
		};
	}

	public getOutgoingStreamSSRCsForUser(user_id: string): SSRCs {
		// LiveKit handles SSRCs internally, so we return mock values
		// In a real implementation, you might want to track these differently
		return {
			audio_ssrc: 0,
			video_ssrc: 0,
			rtx_ssrc: 0,
		};
	}

	public async publishTrack(type: "audio" | "video", ssrc: SSRCs): Promise<void> {
		if (!this._livekitRoom || !this.webrtcConnected) {
			console.warn("Cannot publish track - not connected to LiveKit");
			return;
		}

		// LiveKit handles track publishing differently
		// This is a compatibility method for the existing interface
		console.log(`Publishing ${type} track with SSRC:`, ssrc);
		
		// In a real implementation, you would create and publish the appropriate track
		// For now, we'll just log the action
	}

	public stopPublishingTrack(type: "audio" | "video"): void {
		if (!this._livekitRoom || !this.webrtcConnected) return;

		const localParticipant = this._livekitRoom.localParticipant;
		if (!localParticipant) return;

		// Find and unpublish the track
		const trackKind = type === "audio" ? TrackKind.KIND_AUDIO : TrackKind.KIND_VIDEO;
		for (const publication of localParticipant.trackPublications.values()) {
			if (publication.track && publication.track.kind === trackKind && publication.track.sid) {
				localParticipant.unpublishTrack(publication.track.sid);
			}
		}
	}

	public async subscribeToTrack(user_id: string, type: "audio" | "video"): Promise<void> {
		if (!this._livekitRoom || !this.webrtcConnected) {
			console.warn("Cannot subscribe to track - not connected to LiveKit");
			return;
		}

		// Find the participant
		const participant = Array.from(this._livekitRoom.remoteParticipants.values())
			.find(p => p.identity === user_id);

		if (!participant) {
			console.error(`Participant ${user_id} not found`);
			return;
		}

		// Subscribe to their tracks
		const trackKind = type === "audio" ? TrackKind.KIND_AUDIO : TrackKind.KIND_VIDEO;
		for (const publication of participant.trackPublications.values()) {
			if (publication.track && publication.track.kind === trackKind && !publication.subscribed) {
				await publication.setSubscribed(true);
			}
		}
	}

	public unSubscribeFromTrack(user_id: string, type: "audio" | "video"): void {
		if (!this._livekitRoom || !this.webrtcConnected) return;

		// Find the participant
		const participant = Array.from(this._livekitRoom.remoteParticipants.values())
			.find(p => p.identity === user_id);

		if (!participant) return;

		// Unsubscribe from their tracks
		const trackKind = type === "audio" ? TrackKind.KIND_AUDIO : TrackKind.KIND_VIDEO;
		for (const publication of participant.trackPublications.values()) {
			if (publication.track && publication.track.kind === trackKind && publication.subscribed) {
				publication.setSubscribed(false);
			}
		}
	}

	public async disconnect(): Promise<void> {
		if (this._livekitRoom) {
			await this._livekitRoom.disconnect();
			this._livekitRoom = undefined;
		}
		this.webrtcConnected = false;
		this._isConnected = false;
	}

	public get livekitRoom(): Room | undefined {
		return this._livekitRoom;
	}

	public get isConnected(): boolean {
		return this._isConnected;
	}
}

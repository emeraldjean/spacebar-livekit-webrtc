import type { ClientEmitter, SSRCs, WebRtcClient } from "@spacebarchat/spacebar-webrtc-types";
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
	
	private _apiKey: string;
	private _apiSecret: string;
	private _livekitUrl: string;
	private _isConnected: boolean = false;

	public get isConnected(): boolean {
		return this._isConnected;
	}

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
		// In the correct architecture, clients connect directly to LiveKit
		// This method is kept for compatibility but doesn't actually connect
		// The client should use the token to connect to LiveKit directly
		console.log(`Client ${this.user_id} should connect to LiveKit using token: ${token}`);
		console.log(`LiveKit URL: ${this._livekitUrl}`);
		
		// Simulate connection for compatibility
		this.webrtcConnected = true;
		this._isConnected = true;
		this.emitter.emit("connected");
	}

	public isProducingAudio(): boolean {
		// In the correct architecture, this would be determined by LiveKit's webhooks
		// For now, return false as we don't have direct access to client state
		return false;
	}

	public isProducingVideo(): boolean {
		// In the correct architecture, this would be determined by LiveKit's webhooks
		// For now, return false as we don't have direct access to client state
		return false;
	}

	public isSubscribedToTrack(user_id: string, type: "audio" | "video"): boolean {
		// In the correct architecture, this would be determined by LiveKit's webhooks
		// For now, return false as we don't have direct access to client state
		return false;
	}

	public initIncomingSSRCs(ssrcs: SSRCs): void {
		this.incomingSSRCS = ssrcs;
	}

	public getIncomingStreamSSRCs(): SSRCs {
		// LiveKit handles SSRC internally, this is a mock for compatibility
		return {
			audio_ssrc: 1,
			video_ssrc: 2,
			rtx_ssrc: 3,
		};
	}

	public getOutgoingStreamSSRCsForUser(user_id: string): SSRCs {
		// LiveKit handles SSRC internally, this is a mock for compatibility
		return {
			audio_ssrc: 4,
			video_ssrc: 5,
			rtx_ssrc: 6,
		};
	}

	public publishTrack(type: "audio" | "video", ssrc: SSRCs): Promise<void> {
		// In the correct architecture, clients publish tracks directly to LiveKit
		// This method is kept for compatibility
		console.log(`Client ${this.user_id} should publish ${type} track to LiveKit directly`);
		return Promise.resolve();
	}

	public stopPublishingTrack(type: "audio" | "video"): void {
		// In the correct architecture, clients stop publishing tracks directly to LiveKit
		// This method is kept for compatibility
		console.log(`Client ${this.user_id} should stop publishing ${type} track to LiveKit directly`);
	}

	public async subscribeToTrack(user_id: string, type: "audio" | "video"): Promise<void> {
		// In the correct architecture, clients subscribe to tracks directly via LiveKit
		// This method is kept for compatibility
		console.log(`Client ${this.user_id} should subscribe to ${type} track from ${user_id} via LiveKit directly`);
	}

	public unSubscribeFromTrack(user_id: string, type: "audio" | "video"): void {
		// In the correct architecture, clients unsubscribe from tracks directly via LiveKit
		// This method is kept for compatibility
		console.log(`Client ${this.user_id} should unsubscribe from ${type} track from ${user_id} via LiveKit directly`);
	}

	public async disconnect(): Promise<void> {
		// In the correct architecture, clients disconnect from LiveKit directly
		// This method is kept for compatibility
		console.log(`Client ${this.user_id} should disconnect from LiveKit directly`);
		this.webrtcConnected = false;
		this._isConnected = false;
		this.emitter.emit("disconnected");
	}
}
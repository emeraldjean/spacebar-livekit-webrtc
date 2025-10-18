import type { SignalingDelegate, Codec, WebRtcClient } from "@spacebarchat/spacebar-webrtc-types";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { LiveKitVoiceRoom } from "./LiveKitVoiceRoom";
import { LiveKitWebRtcClient } from "./LiveKitWebRtcClient";

export class LiveKitSignalingDelegate implements SignalingDelegate {
	private _rooms: Map<string, LiveKitVoiceRoom> = new Map();
	private _ip: string;
	private _port: number;
	private _roomServiceClient: RoomServiceClient;
	private _apiKey: string;
	private _apiSecret: string;
	private _livekitUrl: string;

	constructor(apiKey?: string, apiSecret?: string, livekitUrl?: string) {
		this._apiKey = apiKey || process.env.LIVEKIT_API_KEY || "";
		this._apiSecret = apiSecret || process.env.LIVEKIT_API_SECRET || "";
		this._livekitUrl = livekitUrl || process.env.LIVEKIT_URL || "ws://localhost:7880";
		
		if (!this._apiKey || !this._apiSecret) {
			throw new Error("LiveKit API key and secret are required");
		}

		this._roomServiceClient = new RoomServiceClient(this._livekitUrl, this._apiKey, this._apiSecret);
	}

	public start(public_ip: string, portMin: number, portMax: number): Promise<void> {
		this._ip = public_ip;
		// For LiveKit, we don't need to manage ports directly as the server handles this
		// We'll use a default port for compatibility
		this._port = portMin || 7880;
		
		console.log(`LiveKit signaling delegate started with server: ${this._livekitUrl}`);
		return Promise.resolve();
	}

	public join(
		roomId: string,
		userId: string,
		ws: any,
		type: "guild-voice" | "dm-voice" | "stream",
	): Promise<WebRtcClient<any>> {
		// Check if user is already in a voice room (not streams)
		const rooms = type === "stream" ? [] : Array.from(this.rooms.values())
			.filter((room) =>
				room.type === "dm-voice" || room.type === "guild-voice",
			);
		let existingClient;

		for (const room of rooms) {
			let result = room.getClientById(userId);
			if (result) {
				existingClient = result;
				break;
			}
		}

		if (existingClient) {
			console.log("client already connected, disconnect..");
			this.onClientClose(existingClient);
		}

		if (!this._rooms.has(roomId)) {
			console.debug("no room created, creating one...");
			this.createRoom(roomId, type);
		}

		const room = this._rooms.get(roomId)!;
		const client = new LiveKitWebRtcClient(userId, roomId, ws, room, this._apiKey, this._apiSecret, this._livekitUrl);

		room?.onClientJoin(client);

		return Promise.resolve(client);
	}

	public async onOffer(
		client: WebRtcClient<any>,
		sdpOffer: string,
		codecs: Codec[],
	): Promise<{sdp: string, selectedVideoCodec: string}> {
		// For LiveKit, we don't handle SDP offers directly
		// Instead, we generate a token and let the client connect to LiveKit
		// This is a compatibility layer for the existing interface
		
		const room = this._rooms.get(client.voiceRoomId);
		if (!room) {
			console.error("error, client sent an offer but has not authenticated");
			throw new Error("Room not found");
		}

		// Generate LiveKit token for the client
		const token = new AccessToken(this._apiKey, this._apiSecret, {
			identity: client.user_id,
		});
		
		token.addGrant({
			room: client.voiceRoomId,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true,
		});

		const jwt = await token.toJwt();

		// Return a mock SDP response that includes the LiveKit token
		// The client will need to be updated to handle this token
		const mockSdp = `v=0
o=- 0 0 IN IP4 ${this._ip}
s=LiveKit Session
c=IN IP4 ${this._ip}
t=0 0
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
a=ice-ufrag:livekit
a=ice-pwd:livekit
a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
a=setup:actpass
a=mid:0
a=sctp-port:5000
a=max-message-size:262144
a=livekit-token:${jwt}
a=livekit-url:${this._livekitUrl}`;

		// Find the selected video codec
		const videoCodec = codecs.find((val) => val.name === "H264")?.name || "H264";

		return Promise.resolve({
			sdp: mockSdp,
			selectedVideoCodec: videoCodec
		});
	}

	public onClientClose = (client: WebRtcClient<any>) => {
		this._rooms.get(client.voiceRoomId)?.onClientLeave(client as LiveKitWebRtcClient);
	};

	public updateSDP(offer: string): void {
		// Not needed for LiveKit as it handles SDP internally
		console.log("updateSDP called - not implemented for LiveKit");
	}

	public createRoom(
		rtcServerId: string,
		type: "guild-voice" | "dm-voice" | "stream",
	): void {
		this._rooms.set(rtcServerId, new LiveKitVoiceRoom(rtcServerId, type, this));
	}

	public disposeRoom(rtcServerId: string): void {
		const room = this._rooms.get(rtcServerId);
		room?.dispose();
		this._rooms.delete(rtcServerId);
	}

	get rooms(): Map<string, LiveKitVoiceRoom> {
		return this._rooms;
	}

	public getClientsForRtcServer(rtcServerId: string): Set<WebRtcClient<any>> {
		if (!this._rooms.has(rtcServerId)) {
			return new Set();
		}

		return new Set(this._rooms.get(rtcServerId)?.clients.values())!;
	}

	get ip(): string {
		return this._ip;
	}

	get port(): number {
		return this._port;
	}

	get roomServiceClient(): RoomServiceClient {
		return this._roomServiceClient;
	}

	get apiKey(): string {
		return this._apiKey;
	}

	get apiSecret(): string {
		return this._apiSecret;
	}

	get livekitUrl(): string {
		return this._livekitUrl;
	}

	public stop(): Promise<void> {
		// Clean up all rooms
		for (const [roomId, room] of this._rooms) {
			room.dispose();
		}
		this._rooms.clear();
		return Promise.resolve();
	}
}

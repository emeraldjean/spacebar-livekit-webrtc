import {
	IncomingStream,
	OutgoingStream,
	Transport,
} from "@dank074/medooze-media-server";
import type { ClientEmitter, SSRCs, WebRtcClient } from "spacebar-webrtc-types";
import { VoiceRoom } from "./VoiceRoom";
import EventEmitter from "events";

export class MedoozeWebRtcClient implements WebRtcClient<any> {
	websocket: any;
	user_id: string;
	voiceRoomId: string;
	webrtcConnected: boolean;
	emitter: ClientEmitter;
	public transport?: Transport;
	public incomingStream?: IncomingStream;
	public outgoingStream?: OutgoingStream;
	public room?: VoiceRoom;
	public isStopped?: boolean;
	public incomingSSRCS?: SSRCs;

	constructor(
		userId: string,
		roomId: string,
		websocket: any,
		room: VoiceRoom,
	) {
		this.user_id = userId;
		this.voiceRoomId = roomId;
		this.websocket = websocket;
		this.room = room;
		this.webrtcConnected = false;
		this.isStopped = false;
		this.emitter = new EventEmitter()
	}

	public isProducingAudio(): boolean {
		if (!this.webrtcConnected) return false;
		const audioTrack = this.incomingStream?.getTrack(
			`audio-${this.user_id}`,
		);

		if (audioTrack) return true;

		return false;
	}

	public isProducingVideo(): boolean {
		if (!this.webrtcConnected) return false;
		const videoTrack = this.incomingStream?.getTrack(
			`video-${this.user_id}`,
		);

		if (videoTrack) return true;

		return false;
	}

	public isSubscribedToTrack(user_id: string, type: "audio" | "video"): boolean {
		if (!this.webrtcConnected) return false;

		const id = `${type}-${user_id}`;

		const track = this.outgoingStream?.getTrack(id);

		if(track) return true;

		return false;
	}

	public getIncomingStreamSSRCs(): SSRCs {
		if (!this.webrtcConnected)
			return { audio_ssrc: 0, video_ssrc: 0, rtx_ssrc: 0 };

		return {
			audio_ssrc: this.incomingSSRCS?.audio_ssrc ?? 0,
			video_ssrc: this.incomingSSRCS?.video_ssrc ?? 0,
			rtx_ssrc: this.incomingSSRCS?.rtx_ssrc ?? 0,
		};
	}

	public getOutgoingStreamSSRCsForUser(user_id: string): SSRCs {
		const outgoingStream = this.outgoingStream;

		const audioTrack = outgoingStream?.getTrack(`audio-${user_id}`);
		const audio_ssrc = audioTrack?.getSSRCs();
		const videoTrack = outgoingStream?.getTrack(`video-${user_id}`);
		const video_ssrc = videoTrack?.getSSRCs();

		return {
			audio_ssrc: audio_ssrc?.media ?? 0,
			video_ssrc: video_ssrc?.media ?? 0,
			rtx_ssrc: video_ssrc?.rtx ?? 0,
		};
	}

	public publishTrack(type: "audio" | "video", ssrc: SSRCs) {
		if (!this.transport) return;

		const id = `${type}-${this.user_id}`;
		const existingTrack = this.incomingStream?.getTrack(id);

		if (existingTrack) {
			console.error(`error: attempted to create duplicate track ${id}`);
			return;
		}
		let ssrcs;
		if (type === "audio") {
			ssrcs = { media: ssrc.audio_ssrc! };
			this.incomingSSRCS = { ...this.incomingSSRCS, audio_ssrc: ssrc.audio_ssrc }
		} else {
			ssrcs = { media: ssrc.video_ssrc!, rtx: ssrc.rtx_ssrc };
			this.incomingSSRCS = { ...this.incomingSSRCS, video_ssrc: ssrc.video_ssrc, rtx_ssrc: ssrc.rtx_ssrc }
		}
		const track = this.transport?.createIncomingStreamTrack(
			type,
			{ id, ssrcs: ssrcs, media: type },
			this.incomingStream,
		);

		//this.channel?.onClientPublishTrack(this, track, ssrcs);
	}

	public stopPublishingTrack(type: "audio" | "video"): void {
		const id = `${type}-${this.user_id}`;
		const track = this.incomingStream?.getTrack(id);

		if(!track) return;
		if(!this.room) return;

		for (const otherClient of this.room.clients.values()) {
			//remove outgoing track for this user
			otherClient.outgoingStream
				?.getTrack(type)
				?.stop();
		}

		track.stop();
	}

	public subscribeToTrack(user_id: string, type: "audio" | "video") {
		if (!this.transport) return;

		const id = `${type}-${user_id}`;

		const otherClient = this.room?.getClientById(user_id);
		const incomingStream = otherClient?.incomingStream;
		const incomingTrack = incomingStream?.getTrack(id);

		if (!incomingTrack) {
			console.error(`error subscribing, not track found ${id}`);
			return;
		}

		let ssrcs;
		if (type === "audio") {
			ssrcs = {
				media: otherClient?.getIncomingStreamSSRCs().audio_ssrc!,
			};
		} else {
			ssrcs = {
				media: otherClient?.getIncomingStreamSSRCs().video_ssrc!,
				rtx: otherClient?.getIncomingStreamSSRCs().rtx_ssrc,
			};
		}

		const outgoingTrack = this.transport?.createOutgoingStreamTrack(
			incomingTrack.media,
			{ id, ssrcs, media: incomingTrack.media },
			this.outgoingStream,
		);

		outgoingTrack?.attachTo(incomingTrack);
	}

	public unSubscribeFromTrack(user_id: string, type: "audio" | "video"): void {
		if (!this.webrtcConnected) return;

		const id = `${type}-${user_id}`;

		const track = this.outgoingStream?.getTrack(id);

		track?.stop()
	}
}

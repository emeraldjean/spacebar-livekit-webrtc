import { LiveKitSignalingDelegate } from "./LiveKitSignalingDelegate";
import { LiveKitWebRtcClient } from "./LiveKitWebRtcClient";

export class LiveKitVoiceRoom {
    private _clients: Map<string, LiveKitWebRtcClient>;
    private _id: string;
    private _sfu: LiveKitSignalingDelegate;
    private _type: "guild-voice" | "dm-voice" | "stream";

    constructor(
        id: string,
        type: "guild-voice" | "dm-voice" | "stream",
        sfu: LiveKitSignalingDelegate
    ) {
        this._id = id;
        this._type = type;
        this._clients = new Map();
        this._sfu = sfu;
    }

    onClientJoin = (client: LiveKitWebRtcClient) => {
        console.log(`Client ${client.user_id} joining room ${this._id}`);
        this._clients.set(client.user_id, client);
    };

    onClientOffer = async (client: LiveKitWebRtcClient, token: string) => {
        console.log(`Client ${client.user_id} offering connection to room ${this._id}`);
        
        try {
            await client.connectToLiveKit(token);
            console.log(`Client ${client.user_id} connected to LiveKit room`);
        } catch (error) {
            console.error(`Failed to connect client ${client.user_id} to LiveKit:`, error);
            throw error;
        }
    };

    onClientLeave = (client: LiveKitWebRtcClient) => {
        console.log(`Client ${client.user_id} leaving room ${this._id}`);
        this._clients.delete(client.user_id);

        // Disconnect from LiveKit if connected
        if (!client.isStopped) {
            client.isStopped = true;
            client.disconnect();
        }
    };

    get clients(): Map<string, LiveKitWebRtcClient> {
        return this._clients;
    }

    getClientById = (id: string) => {
        return this._clients.get(id);
    };

    get id(): string {
        return this._id;
    }

    get type(): "guild-voice" | "dm-voice" | "stream" {
        return this._type;
    }

    public dispose(): void {
        console.log(`Disposing room ${this._id}`);
        
        const clients = Array.from(this._clients.values());
        for (const client of clients) {
            this.onClientLeave(client);
        }
        this._clients.clear();
        this._sfu = undefined!;
        this._clients = undefined!;
    }

    public getParticipantCount(): number {
        return this._clients.size;
    }

    public getConnectedClients(): LiveKitWebRtcClient[] {
        return Array.from(this._clients.values()).filter(client => client.isConnected);
    }
}

import { Sandbox, SandboxOptions, SandboxPlayer } from "ZEPETO.Multiplay";
import { Player, Transform, Vector3 } from "ZEPETO.Multiplay.Schema";

export default class extends Sandbox {

    onCreate(options: SandboxOptions) 
    {
        //월드 로직 작성 2번 강의
        this.onMessage!("onChangedTransform", (client, message) => {
            const player = this.state.players.get(client.sessionId);

            const transform = new Transform();
            transform.position = new Vector3();
            transform.position.x = message.position.x;
            transform.position.y = message.position.y;
            transform.position.z = message.position.z;

            transform.rotation = new Vector3();
            transform.rotation.x = message.rotation.x;
            transform.rotation.y = message.rotation.y;
            transform.rotation.z = message.rotation.z;

            player!.transform = transform; 
        })

        this.onMessage!("onChangedState", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            player!.state = message.state;
        })
    }

    async onJoin(client: SandboxPlayer) //서버측 코드
    {
        console.log(`[OnJoin] sessionId : ${client.sessionId}, HashCode : ${client.hashCode}, userId : ${client.userId}`)

        const player = new Player();
        player.sessionId = client.sessionId;

        if (client.hashCode)
        {
            player.zepetoHash = client.hashCode;
        }

        if (client.userId) 
        {
            player.zepetoUserId = client.userId;
        }

        this.state.players.set(client.sessionId, player);
    }

    onLeave(client: SandboxPlayer, consented?: boolean) 
    {
        //월드 로직 작성 2번 강의
        this.state.players.delete(client.sessionId);
    }
}
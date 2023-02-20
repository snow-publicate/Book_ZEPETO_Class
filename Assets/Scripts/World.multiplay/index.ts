import { Sandbox, SandboxOptions, SandboxPlayer } from "ZEPETO.Multiplay"; //ZEPETO가 제공하는 핵심 클래스 모음
import { Player, Transform, Vector3 } from "ZEPETO.Multiplay.Schema"; //앞서 제작한 schema 가져오기

export default class extends Sandbox { //ZEPETO가 제공하는 핵심 클래스 중 Sandbox를 상속하여 기능 활용 준비

    onCreate(options: SandboxOptions) { //새로운 방이 생성될 때 동작하는 코드
        // console.log("새로운 방이 정상 생성되었습니다."); <= 필요가 없으므로 주석처리

        // 클라이언트 측의 onChangedState 메세지를 받을 때마다 sessionId로 기존 접속한 
        // 대상 클라이언트를 찾아 state의 변화를 업데이트
        this.onMessage!("onChangedState", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            player!.state = message.state;
        })

        // 클라이언트 측의 onChangedTransform 메세지를 받을 때마다 sessionId로 기존 접속한 
        // 대상 클라이언트를 찾아 위치와 회전각에 해당하는 transform의 변화를 업데이트
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

    }

    // 클라이언트가 서버로 접속하면, 새로운 Player를 생성하여 player변수에 할당,
    // 해당 player변수에 sessionId, hashCode, userId 정보를 모두 할당. 
    // 이렇게 완성된 player변수는 서버의 state.players에 할당.
    async onJoin(client: SandboxPlayer) { //클라이언트가 접속될 때 동작하는 코드
        // console.log("어떤 클라이언트가 접속하였습니다."); <= 필요가 없으므로 주석처리
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

    onLeave(client: SandboxPlayer, consented?: boolean) { //클라이언트가 퇴장할 때 동작하는 코드
        // 퇴장하는 클라이언트의 sessionId를 서버의 state.Players 내부에서 찾아 삭제
        this.state.players.delete(client.sessionId);
    }
}


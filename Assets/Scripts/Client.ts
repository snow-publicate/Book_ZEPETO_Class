import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World'
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { Player, State, Vector3 } from 'ZEPETO.Multiplay.Schema';
import { CharacterState, SpawnInfo, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import * as UnityEngine from 'UnityEngine'

export default class Client extends ZepetoScriptBehaviour {

    public multiplay : ZepetoWorldMultiplay;
    private room : Room;
    
    private currentPlayers: Map<string, Player> = new Map<string, Player>();

    Start() 
    {    
        //서버에서 보내는 room_from_server에 대한 이벤트 리스너(Room이 만들어 질 때 작동) 할당
        this.multiplay.RoomCreated += (room_from_server:Room) => {
            this.room = room_from_server;
        };

        //서버에서 보내는 room_from_server에 대한 이벤트 리스너(Room에 접속하고 있는 동안 계속 작동) 할당
        this.multiplay.RoomJoined += (room_from_server:Room) => {
            room_from_server.OnStateChange += this.OnStateChange;
        };

        //클라이언트 측에서 서버로 0.1초마다 자신의 정보를 전송하는 코루틴 함수 실행
        this.StartCoroutine(this.SendMessageLoop(0.1));
    }

    private OnStateChange(state: State, isFirst: boolean)
    {
        let join = new Map<string, Player>();
        let leave = new Map<string, Player>(this.currentPlayers);

        state.players.ForEach((sessionId: string, player: Player) => {
            if (!this.currentPlayers.has(sessionId))
            {
                join.set(sessionId, player);
            }
            leave.delete(sessionId);
        });
        join.forEach((player: Player, sessionId: string)=> this.OnJoinPlayer(sessionId, player));
        leave.forEach((player: Player, sessionId: string) => this.OnLeavePlayer(sessionId, player));

        if (isFirst)
        {
            //본 클라이언트의 아바타 상태(정지, 이동 등)를 서버로 전송하는 이벤트 리스너
            //추후 코루틴으로 전달할 transform과 달리 사건 발생시에만 전달
            ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
                const myPlayer = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer;
                myPlayer.character.OnChangedState.AddListener((cur, prev) => {
                    this.SendState(cur);
                })
            })

            //각 클라이언트 별 아바타 위치를 서버로부터 전달받아 본 클라이언트에서 추적하는 이벤트 리스너
            ZepetoPlayers.instance.OnAddedPlayer.AddListener((sessionId: string)=>{
                const isLocal = this.room.SessionId === sessionId;
                if (!isLocal) 
                {
                    const player: Player = this.currentPlayers.get(sessionId);

                    player.OnChange += () => this.OnUpdatePlayer(sessionId, player); 
                }
            })
        }
    }

    private OnJoinPlayer(sessionId: string, player: Player): void {
        this.currentPlayers.set(sessionId, player);

        const spawnInfo = new SpawnInfo();
        const position = new UnityEngine.Vector3(0,0,0);
        const rotation = new UnityEngine.Vector3(0,0,0);

        spawnInfo.position = position;
        spawnInfo.rotation = UnityEngine.Quaternion.Euler(rotation);

        const isLocal = this.room.SessionId === player.sessionId;
        ZepetoPlayers.instance.CreatePlayerWithUserId(sessionId, player.zepetoUserId, spawnInfo, isLocal);
    }

    private OnLeavePlayer(sessionId: string, player: Player): void {
        this.currentPlayers.delete(sessionId);

        ZepetoPlayers.instance.RemovePlayer(sessionId);
    }

    private SendState(state: CharacterState) //state는 정지, 걷기 등의 아바타가 지닌 다양한 상태
    {
        const data = new RoomData();
        data.Add("state", state);
        this.room.Send("onChangedState", data.GetObject());
    }

    private OnUpdatePlayer(sessionId: string, player: Player) {
        const position = this.ParseVector3(player.transform.position);

        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        zepetoPlayer.character.MoveToPosition(position);
    }
    private ParseVector3(vector3: Vector3):UnityEngine.Vector3 {
        return new UnityEngine.Vector3(
            vector3.x,
            vector3.y,
            vector3.z,
        )
    }

    //본 클라이언트 측에서 서버로 0.1초마다 본 클라이언트 아바타의 transform 정보를 보내는 코루틴 함수 정의
    private * SendMessageLoop(tick: number) 
    {
        while (true) 
        {
            yield new UnityEngine.WaitForSeconds(tick);

            if (this.room != null && this.room.IsConnected)  //클라이언트가 Room에 접속 중이라면
            {
                //서버에 해당 클라이언트의 sessionId가 있는지 살피고
                const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.room.SessionId); 
                if (hasPlayer) //sessionId가 있으면
                {
                    //myPlayer에 클라이언트의 정보를 담고
                    const myPlayer = ZepetoPlayers.instance.GetPlayer(this.room.SessionId); 

                    //myPlayer, 즉 클라이언트가 정지 중이 아니라면(움직이면),
                    if (myPlayer.character.CurrentState != CharacterState.Idle) 
                    {
                        //클라이언트의 transform값을 넣어 SendTransform 함수 실행
                        this.SendTransform(myPlayer.character.transform); 
                    }
                }
            }
        }
    }

    //클라이언트의 transform값을 서버에 전달하기 위한 함수
    private SendTransform(transform: UnityEngine.Transform) 
    {
        const data = new RoomData(); //RoomData 객체를 담을 data 변수 선언 

        const pos = new RoomData(); //RoomData 객체를 담을 pos 변수 선언 
        pos.Add("x", transform.localPosition.x);
        pos.Add("y", transform.localPosition.y);
        pos.Add("z", transform.localPosition.z);
        data.Add("position", pos.GetObject()); //data변수에 position이란 name으로 pos를 객체화 해서 추가

        const rot = new RoomData(); //RoomData 객체를 담을 rot 변수 선언 
        rot.Add("x", transform.localEulerAngles.x);
        rot.Add("y", transform.localEulerAngles.y);
        rot.Add("z", transform.localEulerAngles.z);
        data.Add("rotation", rot.GetObject()); //data변수에 rotation이란 name으로 rot을 객체화 해서 추가

        //서버의 Room에 onChangedTransform 이벤트로 data를 객체화하여 전달
        this.room.Send("onChangedTransform", data.GetObject()); 
    }
}


export interface Player {
    id: string | null, name: string | undefined, side: "left" | "right" | null   
};

export function shufflePlayers(array: Player[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

export interface GameState {
    ball: { x: number; z: number; vx: number; vz: number, color: number };
    leftPaddle: { x: number, z: number };
    rightPaddle: { x: number, z: number };
    status: "waiting" | "in-progress" | "finished" | "paused" | "starting";
    loop: NodeJS.Timeout | undefined;
    timerDisplay: string;
    scoreDisplay: string;
    matchInfo: string;
    players: Player[];
    matches: { player1: Player, player2: Player, winner: Player | null }[];
    mode: "local" | "remote";
	type: "1v1" | "tournament";
	round: number;
    gameEndTime: DOMHighResTimeStamp;
    whenPaused: DOMHighResTimeStamp;
    player1ready: boolean;
    player2ready: boolean;
  }

export default class PingPongGame {
    public state: GameState;
    private leftPlayer: string | undefined = "Player1";
    private rightPlayer: string | undefined = "Player2";
    private hitter: number = 0;
    private leftScore: number = 0;
    private rightScore: number = 0;
    private maxScore = 3;
    private bounds = { x: 9.6, z: 5.6 };
    private gameDuration = 120000;
    private last: DOMHighResTimeStamp;
    private id: string;

    constructor(id: string, mode: "local" | "remote", type: "1v1" | "tournament") {
        this.id = id;
        this.last = performance.now(),     
        this.state = {
            ball: { x: 0, z: 0, vx: 6.0, vz: 3.5, color: 0xffffff },
            leftPaddle: { x: -8.2, z: 0 },
            rightPaddle: { x: 8.2, z: 0 },
            status: "waiting",
            loop: undefined,
            timerDisplay: "",
            scoreDisplay: "waiting for opponent...",
            matchInfo: "",
            players: [],
            matches: [],
            mode: mode,
			type: type,
			round: 0,
            gameEndTime: performance.now() + this.gameDuration,
            whenPaused: performance.now(),
            player1ready: false,
            player2ready: false
        };
    }

    public matchmake() {
        if (this.state.round === 1) {
            shufflePlayers(this.state.players);
            this.state.matches.push( { player1: this.state.players[0], player2: this.state.players[1], winner: null });
            this.state.matches.push( { player1: this.state.players[2], player2: this.state.players[3], winner: null });
            this.leftPlayer = this.state.matches[0].player1.name;
            this.rightPlayer = this.state.matches[0].player2.name;
            this.resetPlayerSides();
            this.state.matches[0].player1.side = "left";
            this.state.matches[0].player2.side = "right";
        }
        else if (this.state.round === 2) {
            this.leftPlayer = this.state.matches[1].player1.name;
            this.rightPlayer = this.state.matches[1].player2.name;
            this.resetPlayerSides();
            this.state.matches[1].player1.side = "left";
            this.state.matches[1].player2.side = "right";
        }
        else if (this.state.round === 3) {
            if (this.state.matches[0].winner && this.state.matches[1].winner) {
                this.state.matches.push( { player1: this.state.matches[0].winner,  player2: this.state.matches[1].winner, winner: null });
                this.leftPlayer = this.state.matches[2].player1.name;
                this.rightPlayer = this.state.matches[2].player2.name;
                this.resetPlayerSides();
                this.state.matches[2].player1.side = "left";
                this.state.matches[2].player2.side = "right";
            }
        }
        if (this.state.round <= 3)
            this.state.matchInfo += `Next up, Round ${this.state.round}/3:\n${this.leftPlayer} vs ${this.rightPlayer}!`;
    };
    public getId() { return (this.id); };
    public setPlayer(side: "left" | "right" | null, name: string | undefined, id: string | null){
        if (side === "left")
            this.leftPlayer = name;
        else if (side === "right")
            this.rightPlayer = name;
        this.state.players.push({ id: id, name: name, side: side });
    };
	public updatePlayers() {
		for (let i = 0; i < this.state.players.length ; i++) {
			let player = this.state.players[i];
			if (player.side === "left")
            	this.leftPlayer = player.name;
        	else if (player.side === "right")
            	this.rightPlayer = player.name;			
		}
	};
    public getLeftPlayer() { return (this.leftPlayer) };
    public getRightPlayer() { return (this.rightPlayer) };    

    public updateScore() {
         this.state.scoreDisplay = `${this.leftPlayer}: ${this.leftScore}  —  ${this.rightPlayer}: ${this.rightScore}`;   
    };
    public resetGame() {
        this.leftScore = 0;
        this.rightScore = 0;
        this.hitter = 0;
        this.updateScore();
    
        this.state.ball.x = 0;
        this.state.ball.z = 0;
        this.state.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 6;
        this.state.ball.vz = (Math.random() - 0.5) * 4;
        this.state.ball.color = 0xffffff;
    
        this.state.leftPaddle.z = 0;
        this.state.rightPaddle.z = 0;
    
        this.last = performance.now();
        this.state.gameEndTime = this.last + this.gameDuration;
    }

    public update(){
        if (this.state.status !== "in-progress")
            return;
        const now = performance.now();
        const totalSecondsLeft = Math.max(0, Math.floor((this.state.gameEndTime - now) / 1000));
        const minutes = String(Math.floor(totalSecondsLeft / 60)).padStart(2, '0');
        const seconds = String(totalSecondsLeft % 60).padStart(2, '0');
        if (this.state.type === "1v1")
            this.state.timerDisplay = `${minutes}:${seconds}`;
        else
            this.state.timerDisplay = `Round ${this.state.round}/3 ${minutes}:${seconds}`;
        if (now >= this.state.gameEndTime) {
          this.state.status = "finished";

            if (this.state.type === "1v1") {
                if (this.leftScore > this.rightScore) {
                    this.state.matchInfo = `${this.leftPlayer} Wins!`;
                } else if (this.rightScore > this.leftScore) {
                    this.state.matchInfo = `${this.rightPlayer} Wins!`;
                } else {
                    this.state.matchInfo = `It's a tie!`;
                }
            }
            else {
                let i = this.state.round - 1;
                if (this.leftScore > this.rightScore)
                    this.state.matches[i].winner = this.state.matches[i].player1;
                else // for now in a tie, player2 advances
                    this.state.matches[i].winner = this.state.matches[i].player2;
                if (this.state.round < 3)
                    this.state.matchInfo = `Round ${this.state.round} over! ${this.state.matches[i].winner.name} Wins!\n`;
                else
                    this.state.matchInfo = `Tournament Finished! The winner is: ${this.state.matches[i].winner.name}!`
            }
            return;
        }
    
        const dt = Math.min((now - this.last) / 1000, 0.033);
        this.last = now;
    
        if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
            let i = this.state.round - 1;
            if (this.leftScore > this.rightScore)
                this.state.matches[i].winner = this.state.matches[i].player1;
            else // for now in a tie, player2 advances
                this.state.matches[i].winner = this.state.matches[i].player2;
            if (this.state.type === "1v1")
                this.state.matchInfo = `Game Over! ${this.state.matches[i].winner.name} Wins!`;
            else if (this.state.round < 3)
                this.state.matchInfo = `Round ${this.state.round} over! ${this.state.matches[i].winner.name} Wins!\n`;
            else
                this.state.matchInfo = `Tournament Finished! The winner is: ${this.state.matches[2].winner?.name}!`
            this.state.status = "finished";
            return;
        }

        // Move ball
        this.state.ball.z += (this.state.ball.vz * dt);
        this.state.ball.x += (this.state.ball.vx * dt);

        // Bounce on table sides (z)
        if (this.state.ball.z > this.bounds.z || this.state.ball.z < -this.bounds.z) {
            if (this.state.ball.z > this.bounds.z)
                this.state.ball.z = this.bounds.z;
            else if (this.state.ball.z < -this.bounds.z)
                this.state.ball.z = -this.bounds.z;
            this.state.ball.vz *= -1;
        }

        // Paddle collision
        if (this.paddleHit(this.state.leftPaddle) && this.state.ball.vx < 0) {
            this.state.ball.vx *= -1.05;
            const deltaZ = (this.state.ball.z - this.state.leftPaddle.z) * 2.0;
            this.state.ball.vz += deltaZ;
            this.state.ball.color = 0xff6b6b;
            this.hitter = 1;
        }

        if (this.paddleHit(this.state.rightPaddle) && this.state.ball.vx > 0) {
            this.state.ball.vx *= -1.05;
            const deltaZ = (this.state.ball.z - this.state.rightPaddle.z) * 2.0;
            this.state.ball.vz += deltaZ;
            this.state.ball.color = 0x6b8cff;
            this.hitter = 2;
        }

        // Score and reset
        if (this.state.ball.x < -this.bounds.x || this.state.ball.x > this.bounds.x) {
            if (this.state.ball.x < -this.bounds.x && this.hitter != 0) {
                this.hitter = 0;
                this.rightScore++;
            } else if (this.state.ball.x > this.bounds.x && this.hitter != 0) {
                this.hitter = 0;
                this.leftScore++;
            }
            this.updateScore();
            this.state.ball.x = 0;
            this.state.ball.z = 0;
            this.state.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 6;
            this.state.ball.vz = (Math.random() - 0.5) * 4;
            this.state.ball.color = 0xffffff;
        }
    }

    private paddleHit(paddle: {x: number, z: number}) {
        const dx = Math.abs(this.state.ball.x - paddle.x);
        const dz = Math.abs(this.state.ball.z - paddle.z);
        return dx < 1.5 && dz < 2.0;
    }

    private resetPlayerSides() {
        this.state.players.forEach(player => {
            player.side = null;
        });
    }
}
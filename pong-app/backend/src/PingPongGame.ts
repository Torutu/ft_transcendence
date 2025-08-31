export interface GameState {
    ball: { x: number; z: number; vx: number; vz: number, color: number };
    leftPaddle: { x: number, z: number };
    rightPaddle: { x: number, z: number };
    status: "waiting" | "in-progress" | "finished" | "paused";
    // keys: { w: boolean, s: boolean, ArrowUp: boolean, ArrowDown: boolean };
    loop: NodeJS.Timeout | undefined;
    timerDisplay: string;
    scoreDisplay: string;
    players: { id: string | null, name: string | undefined, side: "left" | "right" }[];
    mode: "local" | "remote";
    gameEndTime: DOMHighResTimeStamp;
    whenPaused: DOMHighResTimeStamp;
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
    // private paddleSpeed = 12;
    private gameDuration = 120000;
    private last: DOMHighResTimeStamp;
    private id: string;

    constructor(id: string, mode: "local" | "remote") {
        this.id = id;
        this.last = performance.now(),     
        this.state = {
            ball: { x: 0, z: 0, vx: 6.0, vz: 3.5, color: 0xffffff },
            leftPaddle: { x: -8.2, z: 0 },
            rightPaddle: { x: 8.2, z: 0 },
            status: "waiting",
            // keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
            loop: undefined,
            timerDisplay: "",
            scoreDisplay: "waiting for opponent...",
            players: [],
            mode: mode,
            gameEndTime: performance.now() + this.gameDuration,
            whenPaused: performance.now()
        };
    }

    public getId() { return (this.id); };
    public setPlayer(side: "left" | "right", name: string | undefined, id: string | null){
        if (side === "left")
            this.leftPlayer = name?.substring(0, 10);
        else if (side === "right")
            this.rightPlayer = name?.substring(0, 10);
        this.state.players.push({ id: id, name: name, side: side });
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
        this.state.timerDisplay = `${minutes}:${seconds}`;
    
        if (now >= this.state.gameEndTime) {
          this.state.status = "finished";
          if (this.leftScore > this.rightScore) {
            this.state.scoreDisplay = `${this.leftPlayer} Wins!`;
          } else if (this.rightScore > this.leftScore) {
            this.state.scoreDisplay = `${this.rightPlayer} Wins!`;
          } else {
            this.state.scoreDisplay = `It's a tie!`;
          }
          return;
        }
    
        const dt = Math.min((now - this.last) / 1000, 0.033);
        this.last = now;
    
        if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
            this.state.scoreDisplay = `Game Over! ${this.leftScore >= this.maxScore ? `${this.leftPlayer} Wins!` : `${this.rightPlayer} Wins!`}`;
            this.state.status = "finished";
            return;
        }
    
        // Move paddles
        // if (this.state.keys.w) this.state.leftPaddle.z -= this.paddleSpeed * dt;
        // if (this.state.keys.s) this.state.leftPaddle.z += this.paddleSpeed * dt;
        // if (this.state.keys.ArrowUp) this.state.rightPaddle.z -= this.paddleSpeed * dt;
        // if (this.state.keys.ArrowDown) this.state.rightPaddle.z += this.paddleSpeed * dt;

        // // Clamp paddles
        // if (this.state.leftPaddle.z < -this.bounds.z)
        //     this.state.leftPaddle.z = -this.bounds.z;
        // else if (this.state.leftPaddle.z > this.bounds.z)
        //     this.state.leftPaddle.z = this.bounds.z;
        // if (this.state.rightPaddle.z < -this.bounds.z)
        //     this.state.rightPaddle.z = -this.bounds.z;
        // else if (this.state.rightPaddle.z > this.bounds.z)
        //     this.state.rightPaddle.z = this.bounds.z;

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
}
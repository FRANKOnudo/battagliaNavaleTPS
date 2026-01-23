const net = require("net");
const readline = require("readline");

const socket = net.createConnection(3000);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let myBoard = Array.from({ length: 10 }, () => Array(10).fill("~"));
let enemyBoard = Array.from({ length: 10 }, () => Array(10).fill("~"));
let yourTurn = false;

socket.on("data", data => {
    data.toString().trim().split("\n").forEach(msg => {
        handleMessage(JSON.parse(msg));
    });
});

function handleMessage({ type, payload }) {
    switch (type) {
        case "JOIN_OK":
            console.log("Connesso! ID:", payload.playerId);
            placeShips();
            break;

        case "GAME_START":
            yourTurn = payload.yourTurn;
            printBoards();
            if (yourTurn) attack();
            break;

        case "ATTACK_RESULT":
            enemyBoard[payload.y][payload.x] = payload.result === "MISS" ? "O" : "X";
            printBoards();
            break;

        case "INCOMING_ATTACK":
            myBoard[payload.y][payload.x] = payload.result === "MISS" ? "O" : "X";
            printBoards();
            break;

        case "TURN_CHANGE":
            yourTurn = payload.yourTurn;
            if (yourTurn) attack();
            break;

        case "GAME_OVER":
            console.log("🏆 Vincitore:", payload.winner);
            process.exit();
    }
}

function placeShips() {
    const ships = [];

    console.log("Inserisci 6 navi (x y)");
    function ask(i) {
        if (i === 6) {
            socket.write(JSON.stringify({ type: "PLACE_SHIPS", payload: { ships } }) + "\n");
            return;
        }
        rl.question(`Nave ${i + 1}: `, input => {
            const [x, y] = input.split(" ").map(Number);
            myBoard[y][x] = "S";
            ships.push({
                name: "Ship",
                size: 1,
                positions: [{ x, y }]
            });
            ask(i + 1);
        });
    }
    ask(0);
}

function attack() {
    rl.question("Attacca (x y): ", input => {
        const [x, y] = input.split(" ").map(Number);
        socket.write(JSON.stringify({ type: "ATTACK", payload: { x, y } }) + "\n");
    });
}

function printBoards() {
    console.clear();
    console.log("TUO CAMPO");
    myBoard.forEach(r => console.log(r.join(" ")));
    console.log("\nCAMPO NEMICO");
    enemyBoard.forEach(r => console.log(r.join(" ")));
}

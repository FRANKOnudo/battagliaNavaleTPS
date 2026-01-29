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
            // Verifica che i valori inseriti siano numerici
            if (isNaN(x) || isNaN(y)) {
                console.log("❌ Errore: Formato non valido. Inserire due interi (es: 3 4)");
                return ask(i); // Ripete l'input per l'indice corrente
            }

            // Verifica che le coordinate siano entro i limiti della matrice 
            if (x < 0 || x > 9 || y < 0 || y > 9) {
                console.log("❌ Errore: Coordinate fuori dai limiti del campo (0-9).");
                return ask(i);
            }

            // Verifica se la cella è già occupata da una nave 
            if (myBoard[y][x] === "S") {
                console.log("❌ Errore: Sovrapposizione rilevata. Cella già occupata.");
                return ask(i);
            }
            myBoard[y][x] = "S";
            ships.push({
                name: "Ship",
                size: 1,
                positions: [{ x, y }]
            });
            // Aggiornamento terminale
            printBoards();
            // Inserimento coordinate della nave successiva
            ask(i + 1);
        });
    }
    // Avvio della sequenza di inserimento
    ask(0);
}

function attack() {
    rl.question("Attacca (x y): ", input => {
        const [x, y] = input.split(" ").map(Number);
        // Controllo validità coordinate prima dell'invio al server
        if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
             socket.write(JSON.stringify({ type: "ATTACK", payload: { x, y } }) + "\n");
        } else {
             console.log("Coordinate non valide, riprova.");
             attack();
        }
    });
}

function printBoards() {
    console.clear();
    console.log("TUO CAMPO");
    myBoard.forEach(r => console.log(r.join(" ")));
    console.log("\nCAMPO NEMICO");
    enemyBoard.forEach(r => console.log(r.join(" ")));
}

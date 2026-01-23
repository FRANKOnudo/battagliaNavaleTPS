const net = require('net');

const PORT = 3000;
let players = []; // Array per memorizzare i due giocatori {id, name, socket, ships, board, ready}

const server = net.createServer((socket) => {
    console.log("Nuova connessione stabilita.");

    socket.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(socket, message);
        } catch (e) {
            sendError(socket, "Formato JSON non valido");
        }
    });

    socket.on('close', () => {
        players = players.filter(p => p.socket !== socket);
        console.log("Giocatore disconnesso.");
    });
});

function handleMessage(socket, message) {
    const { type, payload } = message;
    
    switch (type) {
        case 'JOIN':
            handleJoin(socket, payload);
            break;
        case 'PLACE_SHIPS':
            handlePlaceShips(socket, payload);
            break;
        case 'ATTACK':
            handleAttack(socket, payload);
            break;
        default:
            sendError(socket, "Tipo di messaggio non riconosciuto");
    }
}

// --- LOGICA DEI MESSAGGI ---

function handleJoin(socket, payload) {
    if (players.length >= 2) {
        return sendJSON(socket, "ERROR", { message: "Partita già piena" });
    }

    const newPlayer = {
        id: players.length + 1,
        name: payload.playerName,
        socket: socket,
        ships: [],
        ready: false,
        turn: false
    };

    players.push(newPlayer);
    sendJSON(socket, "JOIN_OK", { playerId: newPlayer.id });

    console.log(`${newPlayer.name} si è unito.`);
}

function handlePlaceShips(socket, payload) {
    const player = players.find(p => p.socket === socket);
    if (!player) return;

    // Salviamo la flotta inviata dal client
    player.ships = payload.ships;
    player.ready = true;
    
    sendJSON(socket, "PLACE_SHIPS_OK", {});
    console.log(`${player.name} ha posizionato le navi.`);

    // Se entrambi sono pronti, inizia la partita
    if (players.length === 2 && players.every(p => p.ready)) {
        players[0].turn = true; // Il primo che si è connesso inizia
        
        sendJSON(players[0].socket, "GAME_START", { yourTurn: true });
        sendJSON(players[1].socket, "GAME_START", { yourTurn: false });
    }
}

function handleAttack(socket, payload) {
    const attacker = players.find(p => p.socket === socket);
    const defender = players.find(p => p.socket !== socket);

    if (!attacker.turn) {
        return sendError(socket, "Non è il tuo turno");
    }

    const { x, y } = payload;
    let result = "MISS";
    let shipName = null;

    // Logica di controllo collisione con navi del difensore
    defender.ships.forEach(ship => {
        ship.positions.forEach(pos => {
            if (pos.x === x && pos.y === y) {
                result = "HIT";
            }
        });
    });

    // Risultato all'attaccante
    sendJSON(attacker.socket, "ATTACK_RESULT", { x, y, result });
    
    // Notifica al difensore
    sendJSON(defender.socket, "INCOMING_ATTACK", { x, y, result });

    // Cambio turno
    attacker.turn = false;
    defender.turn = true;
    sendJSON(attacker.socket, "TURN_CHANGE", { yourTurn: false });
    sendJSON(defender.socket, "TURN_CHANGE", { yourTurn: true });
}

// --- UTILS ---

function sendJSON(socket, type, payload) {
    socket.write(JSON.stringify({ type, payload }) + "\n");
}

function sendError(socket, message) {
    sendJSON(socket, "ERROR", { message });
}

server.listen(PORT, () => {
    console.log(`Server Battaglia Navale attivo sulla porta ${PORT}`);
});
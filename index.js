import { createServer } from 'https';
import { appendFileSync, fstat, readFileSync, writeFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import util from "util"
import { appendFile, open, readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'path';
import { createConnection } from "mysql"

const server = createServer({
    cert: readFileSync('C:/xampp/htdocs/crt/server.crt'),
    key: readFileSync('C:/xampp/htdocs/crt/server.key'),
    port: 9454,
});

const wss = new WebSocketServer({ server });

let sql = createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'feiegame_battleship'
});

let width = 8
let gamesArr = getGames()
const id2pos = (id, width) => [Math.floor(id / width), id % width]

wss.on('connection', function connection(ws) {
    console.log("New connection.");
    ws.on('message', function message(data) {
        let dataMsg = util.format("%s", data)
        console.log('received: %s', dataMsg);

        let dataArr
        try {
            dataArr = JSON.parse(dataMsg)
        } catch (error) {
            console.log("dataArr decode fail!\n" + error);
            return
        }

        switch (dataArr[0]) {
            case "eval":
                ws.send(eval(dataArr[1]))
                break
            case "getgames":
                getGames().then(r => {
                    gamesArr = r
                    let dataToSend = ["gamelist", gamesArr]
                    dataToSend = JSON.stringify(dataToSend)
                    ws.send(dataToSend)
                })
                break;
            case "creategame":
                let id = uuidv4()
                let name = dataArr[1].name
                let tags = dataArr[1].tags
                let sqlString = `INSERT INTO savesmap(name,uuid,blueState,redState,gameState,tags) value("${name}","${id}",0,0,0,'${JSON.stringify(tags)}')`
                console.log(sqlString);
                sql.query(sqlString, function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }
                }
                )
                let d = new Date()
                writeFile("c:/xampp/htdocs/WServer/saves/" + id + ".save", d.toString() + "\n").then(() => {
                })

                ws.send(JSON.stringify(["enterroom", id, 0, 0]))
                break;
            case "gstart":

                break
            case "genter":
                let Faction = () => {
                    if (dataArr[2] == 0) {
                        return "blueState"
                    } else { return "redState" }
                }
                let enterSQL = "UPDATE savesmap SET " + Faction() + "=2 WHERE uuid='" + dataArr[1] + "';"

                console.log(enterSQL);
                sql.query(enterSQL, function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }
                    let searchSQL = "SELECT * from savesmap WHERE uuid='" + dataArr[1] + "';"
                    console.log(searchSQL);
                    sql.query(searchSQL, function (err, result) {
                        if (err) {
                            console.log('[CREATE ERROR] - ', err.message);
                            return;
                        }
                        getNowTurn(dataArr[1]
                        ).then(nowTurn => {
                            ws.send(JSON.stringify(["entergame", result[0].blueState, result[0].redState, nowTurn]))
                            ws.uuid = dataArr[1]
                            wss.clients.forEach(c => {
                                if (c.uuid == dataArr[1]) {
                                    c.send(JSON.stringify(["gameframe", { type: "playerjoin", data: dataArr[2] }]))
                                }
                            })
                            if (nowTurn[0] > 0) {
                                let save = getSave(dataPacket.id)
                                let saveArr = save.split("\n")
                                let lookForMap
                                if (dataArr[2] == 0) {
                                    lookForMap = "blue"
                                } else {
                                    lookForMap = "red"
                                }
                                let map
                                if (save.includes("red attack")) {
                                    map = saveArr[saveArr.lookForLastInclude(lookForMap) - 1].slice(6)

                                } else {
                                    map = saveArr[saveArr.lookForFirstInclude(lookForMap) + 1].slice(6)

                                }
                                ws.send(JSON.parse(["gameframe", { type: "map", map }]))
                            }
                        })
                    })
                })
                break
            case "gselect":
                let searchSQL = "SELECT * from savesmap WHERE uuid='" + dataArr[1] + "';"
                console.log(searchSQL);
                sql.query(searchSQL, function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }
                    console.log(result[0]);
                    ws.send(JSON.stringify(["enterroom", dataArr[1], result[0].blueState, result[0].redState]))

                })

                break
            case "gameframe":
                let dataPacket = dataArr[1]
                switch (dataPacket.type) {
                    case "confirm":
                        appendFileSync("c:/xampp/htdocs/WServer/saves/" + dataPacket.id + ".save", `${dataPacket.faction} confirm:\n`)
                        appendFileSync("c:/xampp/htdocs/WServer/saves/" + dataPacket.id + ".save", "JSON: " + dataPacket.data + "\n")
                        broadcast(ws.uuid, ["gameframe", { type: "playerconfirm", data: dataPacket.faction }])
                        getNowTurn(dataPacket.id).then(turn => broadcast(ws.uuid, ["gameframe", { type: "next", data: { turn: turn[0], factionNow: turn[1] } }]))
                        break;
                    case "attack":
                        let lookForMap
                        if (dataPacket.faction == "blue") {
                            lookForMap = "red"
                        } else {
                            lookForMap = "blue"
                        }
                        let save = getSave(dataPacket.id)
                        let saveArr = save.split("\n")
                        let map
                        if (save.includes("red attack")) {
                            map = JSON.parse(saveArr[saveArr.lookForLastInclude(lookForMap) - 1].slice(6))

                        } else {
                            map = JSON.parse(saveArr[saveArr.lookForFirstInclude(lookForMap) + 1].slice(6))

                        }

                        switch (dataPacket.data.type) {
                            case "normal":
                                let dieShip = []

                                let posToAtt = id2pos(dataPacket.data.pos, 8)
                                if (map[posToAtt[0]][posToAtt[1]] == null) {
                                    broadcast(ws.uuid, ["gameframe", { type: "attfail", data: { pos: dataPacket.data.pos, faction: dataPacket.faction } }])
                                    map[posToAtt[0]][posToAtt[1]] = "attacked"
                                } else {
                                    broadcast(ws.uuid, ["gameframe", { type: "attsuccess", data: { pos: dataPacket.data.pos, faction: dataPacket.faction } }])
                                    let shipToBeAtt = map[posToAtt[0]][posToAtt[1]]
                                    for (let index = 0; index < map.length; index++) {
                                        const element = map[index];
                                        for (let index_ = 0; index_ < element.length; index_++) {
                                            const element_ = element[index_];
                                            if (element_) {
                                                if (element_.id == shipToBeAtt.id) {
                                                    element_.alive -= 1
                                                    if (element_.alive == 0) {
                                                        dieShip.push(index * width + index_)
                                                        map[index][index_] = "sinkShip"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                appendFileSync("c:/xampp/htdocs/WServer/saves/" + dataPacket.id + ".save", `${dataPacket.faction} attacked:\n`)
                                appendFileSync("c:/xampp/htdocs/WServer/saves/" + dataPacket.id + ".save", "JSON: " + JSON.stringify(map) + "\n")
                                if (dieShip.length > 0) {
                                    broadcast(ws.uuid, ["gameframe", { type: "shipSink", data: { shipid: dieShip, faction: dataPacket.faction } }])
                                    if (!JSON.stringify(map).includes("aliveShip")) {
                                        broadcast(ws.uuid, ["gameframe", { type: "playersuccess", faction: dataPacket.faction }])
                                        appendFileSync("c:/xampp/htdocs/WServer/saves/" + dataPacket.id + ".save", `${dataPacket.faction} successed!\n`)
                                        let delSQL = 'DELETE FROM savesmap WHERE uuid="' + dataPacket.id + '"'
                                        console.log(delSQL);
                                        sql.query(delSQL, function (err, result) {
                                            if (err) {
                                                console.log('[SELECT ERROR] - ', err.message);
                                            }
                                        })
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                        getNowTurn(dataPacket.id).then(turn => broadcast(ws.uuid, ["gameframe", { type: "next", data: { turn: turn[0], factionNow: turn[1] } }]))
                    default:
                        break;
                }
                break
            default:
                break;
        }
    });
})

wss.on('close', function () {
    console.log("Connection close.");
});

server.listen(9454);

function getGames() {
    return new Promise(function (resolve, reject) {
        let returnData = []
        console.log('SELECT * FROM savesmap');
        sql.query('SELECT * FROM savesmap', function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                reject()
            }
            for (let index = 0; index < result.length; index++) {
                const element = result[index];
                let line = { name: element.name, id: element.uuid, blueState: element.blueState, redState: element.redState, gameState: element.gameState, tags: JSON.parse(element.tags) }
                returnData.push(line)
            }
            resolve(returnData)
        })
    })
}

function getNowTurn(id) {
    return new Promise(function (resolve, reject) {
        let save = readFileSync("c:/xampp/htdocs/WServer/saves/" + id + ".save")
        save = util.format("%s", save)
        let factionNow
        let turn = Math.min(save.includeTimes("blue"), save.includeTimes("red"))
        if (save.includeTimes("blue") <= save.includeTimes("red")) {
            factionNow = "blue"
        }
        else {
            factionNow = "red"
        }
        resolve([turn, factionNow])
    })
}

function SQLselect(command) {
    return new Promise(function (resolve, reject) {
        sql.query(command, function (err, result) {
            if (err) {
                console.log("SQL error: " + err);
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

function broadcast(id, data) {
    wss.clients.forEach(c => {
        if (c.uuid == id) {
            c.send(JSON.stringify(data))
        }
    })

}

String.prototype.includeTimes = function (str) {
    let oriStr = this
    let num = 0
    let replace = () => {
        if (oriStr != oriStr.replace(str, "")) {
            num++
            oriStr = oriStr.replace(str, "")
            replace()
        }
    }
    replace()
    return num
}

function getSave(id) {
    let save = readFileSync("c:/xampp/htdocs/WServer/saves/" + id + ".save")
    save = util.format("%s", save)
    return save
}

Array.prototype.lookForLastInclude = function (str) {
    let pos = -1
    for (let index = 0; index < this.length; index++) {
        const element = String(this[index]);
        if (element.includes(str)) {
            pos = index
        }
    }
    return pos
}

Array.prototype.lookForFirstInclude = function (str) {
    let pos = -1
    for (let index = 0; index < this.length; index++) {
        const element = String(this[index]);
        if (element.includes(str)) {
            pos = index
            return pos

        }
    }
    return pos
}
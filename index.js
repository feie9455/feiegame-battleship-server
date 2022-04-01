import { createServer } from 'https';
import { appendFileSync, fstat, readFileSync, writeFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import util from "util"
import { appendFile, open, readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'path';
import { createConnection } from "mysql"

const server = createServer({
    cert: readFileSync('C:/xampp/htdocs/WServer/server.crt'),
    key: readFileSync('C:/xampp/htdocs/WServer/server.key'),
    port: 9454,
});

const wss = new WebSocketServer({ server });

let sql = createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'feiegame_battleship'
});

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
                let sqlString = `INSERT INTO savesmap(name,uuid,blueState,redState,gameState) value("${dataArr[1]}","${id}",0,0,0)`
                console.log(sqlString);
                sql.query(sqlString, function (err, result) {
                }
                )
                let d =new Date()
                writeFileSync("./saves/"+id+".sav",d.toString())
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
                                    c.send(JSON.stringify(["gameframe", "playerjoin", dataArr[2]]))
                                }
                            })
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
                let line = []
                line.push(element.name)
                line.push(element.uuid)
                line.push(element.blueState)
                line.push(element.redState)
                line.push(element.gameState)
                returnData.push(line)
            }
            resolve(returnData)
        })
    })
}

function getNowTurn(id) {
    return new Promise(function (resolve, reject) {
        let searchBlueSQL = "SELECT * from `" + id + "` WHERE event='bluePut';"
        let searchRedSQL = "SELECT * from `" + id + "` WHERE event='redPut';"
        console.log(searchBlueSQL);
        console.log(searchRedSQL);
        Promise.all([SQLselect(searchBlueSQL), SQLselect(searchRedSQL)]).then(result => {
            let turn_ = Math.min(result[1].length, result[0].length)
            if (result[0].length > result[1].length) {
                resolve([turn_, "red"])
            } else {
                resolve([turn_, "blue"])
            }
        })
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
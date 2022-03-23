import { createServer } from 'https';
import { appendFileSync, fstat, readFileSync, writeFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import util from "util"
import { appendFile, open, readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'path';
import { createConnection } from "mysql"

const server = createServer({
    cert: readFileSync('server.crt'),
    key: readFileSync('server.key'),
});

const wss = new WebSocketServer({ server });

let sql = createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'feiegame_battleship'
});

let gamesArr = getGames()


wss.on('connection', function connection(ws) {
    console.log("New connection.");
    ws.on('message', function message(data) {
        let dataMsg = util.format("%s", data)
        let dataArr = JSON.parse(dataMsg)
        console.log('received: %s', dataMsg);

        switch (dataArr[0]) {
            case "getgames":
                getGames().then(r => {
                    gamesArr = r
                    let dataToSend = ["gamelist", gamesArr]
                    dataToSend = JSON.stringify(dataToSend)
                    console.log(dataToSend);
                    ws.send(dataToSend)
                })
                break;
            case "creategame":
                let id = uuidv4()
                console.log(`INSERT INTO savesmap(name,uuid,blueState,redState,gameState) value("${dataArr[1]}","${id}",0,0,0)`);
                sql.query(`INSERT INTO savesmap(name,uuid,blueState,redState,gameState) value("${dataArr[1]}","${id}",0,0,0)`, function (err, result) {
                    if (err) {
                        console.log('[INSERT ERROR] - ', err.message);
                        return;
                    }
                }
                )
                let createTableSQL = 'CREATE TABLE IF NOT EXISTS `' + id + '`(turn int,Faction CHAR,data JSON);'
                console.log(createTableSQL);
                sql.query(createTableSQL, function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }

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
                        if (result[0].gameState == "0") {
                            ws.send(JSON.stringify(["entergame", 0]))
                        }
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

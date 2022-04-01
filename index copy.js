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
                let createTableSQL = 'CREATE TABLE IF NOT EXISTS `' + id + '`(event TEXT,data JSON);'
                console.log(createTableSQL);
                sql.query(createTableSQL, function (err, result) {
                    let cTime = new Date()
                    cTime = cTime.getDate()
                    let gameSetting = { tags: [], createTime: cTime }
                    let SQLString = "INSERT INTO `" + id + "`(event,data) value('gameSetting','" + JSON.stringify(gameSetting) + "')"
                    console.log(SQLString);
                    sql.query(createTableSQL, function (err, result) {
                    })
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
                let event
                let saveid = dataArr[1][0]
                let faction = dataArr[1][1]
                if (faction == "blue") {
                    event = "bluePut"
                } else {
                    event = "redPut"
                }
                switch (dataArr[2]) {
                    case "confirm":
                        let SQLString = "INSERT INTO `" + saveid + "`(event,data) value('" + event + "','" + JSON.stringify(dataArr[3]) + "')"
                        console.log(SQLString);
                        sql.query(SQLString, function (err, result) {
                            if (err) {
                                console.log('[CREATE ERROR] - ', err.message);
                                return;
                            }
                            getNowTurn(saveid).then(turn => {
                                if (turn[0] > 0) {
                                    broadcast(saveid, ["gameframe", "next", turn])
                                }
                            })
                            broadcast(saveid, ["gameframe", "playerconfirm", faction])
                        })
                        break;
                    case "getturn":
                        getNowTurn(saveid).then(turn => {

                            broadcast(saveid, ["gameframe", "turninfo", turn])

                        })
                        break
                    case "attack":
                        let event_
                        if (faction == "blue") {
                            event_ = "redPut"
                        } else {
                            event_ = "bluePut"
                        }
        
                        let sql_ = "SELECT * from `" + saveid + "` WHERE event='" + event_ + "';"
                        console.log(sql_);
                        SQLselect(sql_).then(oriMap => {
                            oriMap = oriMap[oriMap.length - 1].data
                            oriMap = JSON.parse(oriMap)
                            let attackPos = id2pos(dataArr[3], oriMap[0].length)
                            let attackObj = oriMap[attackPos[0]][attackPos[1]]
                            if (attackObj != null) {
                                broadcast(saveid,["gameframe", "attsuccess", faction, dataArr[3]])
                                let id = attackObj.id
                                for (let index = 0; index < oriMap.length; index++) {
                                    const line = oriMap[index];
                                    for (let index_ = 0; index_ < line.length; index_++) {
                                        const block = line[index_];
                                        if (block) {
                                            if (block.id == id) {
                                                oriMap[index][index_].alive--

                                            }
                                        }
                                    }
                                }
                                oriMap[attackPos[0]][attackPos[1]] = { name: "attacked" }

                            } else {
                                broadcast(saveid,["gameframe", "attfail", faction, dataArr[3]])
                                oriMap[attackPos[0]][attackPos[1]] = { name: "attacked" }

                            }
                            let sql2 = "INSERT INTO `" + saveid + "`(event,data) value('" + event + "','" + JSON.stringify(oriMap) + "')"
                            console.log(sql2);
                            sql.query(sql2, function (err, result) {
                                if (err) {
                                    console.log('[CREATE ERROR] - ', err.message);
                                    return;
                                }
                                getNowTurn(saveid).then(turn => {
                                    if (turn[0] > 0) {
                                        broadcast(saveid, ["gameframe", "next", turn])
                                    }
                                })

                            })

                        })

                    default:
                        break;
                }
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
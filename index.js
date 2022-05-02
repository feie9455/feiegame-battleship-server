import { createServer } from 'https';
import { appendFileSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import util from "util"
import { appendFile, open, readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { createConnection } from "mysql"
import { zh, en } from "naughty-words";

const server = createServer({
    cert: readFileSync('C:/xampp/htdocs/crt/server.crt'),
    key: readFileSync('C:/xampp/htdocs/crt/server.key'),
    port: 9454,
});
let bannedWord = zh
bannedWord = bannedWord.concat(en)
const wss = new WebSocketServer({ server });
let sql
function createConnection_() {
    let sql_ = createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'feiegame_battleship'
    });
    return sql_
}

function sqlConnect() {
    sql = createConnection_()
    sql.connect(function (err) {
        if (err) {
            console.error('Cannot connect to MySQL server.');
            setTimeout(() => {
                sqlConnect()
            }, 1000);
        } else {
            console.log('Connected MySQL server as threadId ' + sql.threadId);
        }
    });
}

sqlConnect()
sql.on('error', function (err) {
    console.log(err);
    setTimeout(() => {
        sqlConnect()
    }, 1000);
});
let gamesArr = []
const id2pos = (id, width) => [Math.floor(id / width), id % width]

wss.on('connection', function connection(ws, req) {
    ws.send(JSON.stringify(["hello", "world"]))
    const ip = req.socket.remoteAddress;
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
            case "getNotification":
                readFile(process.argv[1].slice(0, process.argv[1].length - 9) + "/publicNotification").then(data => ws.send(JSON.stringify(["notification", util.format("%s", data)])))
                break
            case "chat":
                let msg = dataArr[2]
                bannedWord.forEach(word => { msg=msg.allReplace(word) })
                broadcast(ws.uuid, ["chat", { faction: dataArr[1], type: "chat", msg: msg }])
                break
            case "getSaveList":
                //遍历文件夹
                let saveList = []
                let files = readdirSync("c:/xampp/htdocs/WServer/saves/archive/");
                files.forEach(function (file) {
                    let stat = statSync("c:/xampp/htdocs/WServer/saves/archive/" + file);
                    if (!stat.isDirectory()) {
                        let fileData = readFileSync("c:/xampp/htdocs/WServer/saves/archive/" + file)
                        fileData = util.format("%s", fileData)
                        let fileArr = fileData.split("\n")
                        //检测tags是否为json格式
                        let tags = fileArr[7]
                        try {
                            tags = JSON.parse(tags)
                        } catch (error) {
                            console.log("tags decode fail!\n" + error);
                        }
                        let line = { name: fileArr[5], id: fileArr[3], tags: tags }
                        saveList.push(line)
                    }
                });
                ws.send(JSON.stringify(["savelist", saveList]))

                break

            case "getSave":
                let save = readFileSync("c:/xampp/htdocs/WServer/saves/archive/" + dataArr[1] + ".save")
                save = util.format("%s", save)
                ws.send(JSON.stringify(["save", save]))
                break

            case "downloadSave":
                let saveData = readFileSync("c:/xampp/htdocs/WServer/saves/archive/" + dataArr[1] + ".save")
                saveData = util.format("%s", saveData)
                ws.send(JSON.stringify(["download", dataArr[1] + ".save", saveData]))
                break
            case "editRoom":
                sql.query("SELECT * from savesmap WHERE uuid='" + dataArr[1] + "';", function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }
                    if (result.length == 0) {
                        ws.send(JSON.stringify(["warning", "房间不存在"]))
                        return
                    }
                    if (result[0].ip != ip) {
                        ws.send(JSON.stringify(["warning", "你没有权限修改这个房间"]))
                        return
                    } else {
                        sql.query("delete from savesmap where uuid='" + dataArr[1] + "';", function (err, result) { })
                        ws.send(JSON.stringify(["success", "删除成功"]))
                    }

                }
                )
                break;
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
                let sqlString = `INSERT INTO savesmap(name,uuid,blueState,redState,gameState,tags,ip) value("${name}","${id}",0,0,0,'${JSON.stringify(tags)}','${ip}')`
                console.log(sqlString);
                sql.query(sqlString, function (err, result) {
                    if (err) {
                        console.log('[CREATE ERROR] - ', err.message);
                        return;
                    }
                }
                )
                let d = new Date()
                writeFile(`c:/xampp/htdocs/WServer/saves/running/${id}.save`, `startTime:\n${d.toString()}\nid:\n${id}\nname:\n${name}\ntags:\n${JSON.stringify(tags)}\n`).then(() => {
                })
                ws.send(JSON.stringify(["enterroom", id, 0, 0]))
                break;
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
                            getSaveTags(dataArr[1]).then(tags => {
                                ws.send(JSON.stringify(["entergame", { blueState: result[0].blueState, redState: result[0].redState, nowTurn: nowTurn[0], nowPlayer: nowTurn[1], tags: tags, name: result[0].name }]))
                                if (tags.includes("th11")) {
                                    ws.send(JSON.stringify(["gameframe", { type: "senditem", items: [{ type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 4 }] }]))
                                } else if (tags.includes("th21")) {
                                    ws.send(JSON.stringify(["gameframe", { type: "senditem", items: [{ type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 4 }] }]))
                                } else if (tags.includes("th31")) {
                                    ws.send(JSON.stringify(["gameframe", { type: "senditem", items: [{ type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 4 }, { type: "ship", length: 4 }] }]))
                                } else {
                                    ws.send(JSON.stringify(["gameframe", { type: "senditem", items: [{ type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 2 }, { type: "ship", length: 3 }, { type: "ship", length: 3 }, { type: "ship", length: 4 }] }]))
                                }
                            })
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
                        ws.send(JSON.stringify(["warning", "房间不存在，请检查分享链接"]))
                        return;
                    }
                    console.log(result[0]);
                    if (result[0]) {
                        ws.send(JSON.stringify(["enterroom", dataArr[1], result[0].blueState, result[0].redState]))
                    }
                    else {
                        ws.send(JSON.stringify(["warning", "房间不存在，请检查分享链接"]))
                    }
                })
                break

            case "gameframe":
                let dataPacket = dataArr[1]
                switch (dataPacket.type) {
                    case "confirm":
                        appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", `${dataPacket.faction} confirm:\n`)
                        appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", "JSON: " + dataPacket.data + "\n\n")
                        broadcast(ws.uuid, ["gameframe", { type: "playerconfirm", data: dataPacket.faction }])
                        getNowTurn(dataPacket.id).then(turn => broadcast(ws.uuid, ["gameframe", { type: "next", data: { turn: turn[0], factionNow: turn[1], canAttackTimes: turn[2] } }]))
                        break;
                    case "attack":
                        let needSendNext = true
                        getSaveTags(dataPacket.id).then(tags => {
                            let height
                            let width
                            if (tags.includes("td11")) {
                                height = width = 9
                            } else if (tags.includes("td21")) {
                                height = width = 10
                            } else if (tags.includes("td31")) {
                                height = width = 12
                            } else {
                                height = width = 8
                            }
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
                                map = JSON.parse(saveArr[saveArr.lookForLastInclude(lookForMap) - 2].slice(6))

                            } else {
                                map = JSON.parse(saveArr[saveArr.lookForFirstInclude(lookForMap) + 1].slice(6))

                            }
                            const normalAttack = async function (pos) {

                                let diedShip = []
                                let posToAtt = id2pos(pos, width)
                                if (map[posToAtt[0]][posToAtt[1]] == "attacked") {
                                    return
                                }
                                if (map[posToAtt[0]][posToAtt[1]] == null) {
                                    broadcast(ws.uuid, ["gameframe", { type: "attfail", data: { pos: pos, faction: dataPacket.faction } }])
                                    return { pos: pos, isMiss: "none" }
                                } else {
                                    let chance = 1
                                    let tags = await getSaveTags(dataPacket.id)
                                    tags = JSON.stringify(tags)
                                    if (tags.includes("tf11")) {
                                        chance = 0.9
                                    } else if (tags.includes("tf21")) {
                                        chance = 0.8
                                    } else if (tags.includes("tf31")) {
                                        chance = 0.65
                                    }
                                    if (hit(chance)) {

                                        broadcast(ws.uuid, ["gameframe", { type: "attsuccess", data: { pos: pos, faction: dataPacket.faction } }])
                                        let shipToBeAtt = map[posToAtt[0]][posToAtt[1]]
                                        for (let index = 0; index < map.length; index++) {
                                            const element = map[index];
                                            for (let index_ = 0; index_ < element.length; index_++) {
                                                const element_ = element[index_];
                                                if (element_) {
                                                    if (element_.id == shipToBeAtt.id) {
                                                        map[index][index_].alive -= 1
                                                        if (element_.alive == 0) {
                                                            diedShip = diedShip.concat(element_.pos)
                                                            map[index][index_] = "sinkShip"
                                                        }
                                                    }
                                                }
                                            }

                                        }
                                        map[posToAtt[0]][posToAtt[1]] = "attacked"
                                        if (diedShip.length > 0) {
                                            shipDied(diedShip)
                                        }
                                        return { pos: pos, isMiss: "false" }
                                    }
                                    else {
                                        broadcast(ws.uuid, ["gameframe", { type: "attmiss", data: { pos: pos, faction: dataPacket.faction } }])
                                        return { pos: pos, isMiss: "true" }
                                    }


                                }

                            }
                            const shipDied = (pos) => {
                                broadcast(ws.uuid, ["gameframe", { type: "shipSink", data: { shipid: pos, faction: dataPacket.faction } }])

                            }
                            const attEnd = (map, result) => {
                                appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", `${dataPacket.faction} attacked:\n`)
                                appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", "JSON: " + JSON.stringify(map) + "\n")
                                appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", JSON.stringify({ type: dataPacket.data.type, result: result }) + "\n")
                                if (!JSON.stringify(map).includes("aliveShip")) {
                                    broadcast(ws.uuid, ["gameframe", { type: "playersuccess", faction: dataPacket.faction }])
                                    appendFileSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", `${dataPacket.faction} successed!\n`)
                                    let delSQL = 'DELETE FROM savesmap WHERE uuid="' + dataPacket.id + '"'
                                    console.log(delSQL);
                                    sql.query(delSQL, function (err, result) {
                                        if (err) {
                                            console.log('[SELECT ERROR] - ', err.message);
                                        }
                                    })
                                    needSendNext = false
                                    renameSync("c:/xampp/htdocs/WServer/saves/running/" + dataPacket.id + ".save", "c:/xampp/htdocs/WServer/saves/archive/" + dataPacket.id + ".save")
                                }

                                if (needSendNext) {

                                    getNowTurn(dataPacket.id).then(turn => broadcast(ws.uuid, ["gameframe", { type: "next", data: { turn: turn[0], factionNow: turn[1], canAttackTimes: turn[2] } }]))

                                }

                            }
                            switch (dataPacket.data.type) {

                                case "normal":
                                    let commands = []
                                    dataPacket.data.pos.forEach(pos => {
                                        commands.push(normalAttack(pos))
                                    })
                                    Promise.all(commands).then(result => {
                                        attEnd(map, result)
                                    })

                                    break;
                                default:
                                    break;
                            }

                        })
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
        sql.query('SELECT * FROM savesmap', function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
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

function attack(posid, faction, type, roomid) {
    switch (type) {
        case "no":

            break;

        default:
            break;
    }
}



function getNowTurn(id) {
    return new Promise(function (resolve, reject) {
        let save = readFileSync("c:/xampp/htdocs/WServer/saves/running/" + id + ".save")
        save = util.format("%s", save)
        let factionNow
        let turn = Math.min(save.includeTimes("blue"), save.includeTimes("red"))
        if (save.includeTimes("blue") <= save.includeTimes("red")) {
            factionNow = "blue"
        }
        else {
            factionNow = "red"
        }
        let canAttackTimes = 1
        getSaveTags(id).then(tags => {
            tags = JSON.stringify(tags)
            if (tags.includes("te11")) {
                if (turn % 4 == 0) {
                    canAttackTimes = 2
                }
            }
            if (tags.includes("te21")) {
                if (turn % 2 == 0) {
                    canAttackTimes = 2
                }
            }
            if (tags.includes("te31")) {
                canAttackTimes = 2

            }
            resolve([turn, factionNow, canAttackTimes])
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

function getSaveTags(id) {
    return new Promise(function (resolve, reject) {
        sql.query('SELECT * FROM savesmap WHERE uuid="' + id + '"', function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                reject()
            }
            resolve(JSON.parse(result[0].tags))
        })
    })
}

//命中判定
const hit = (chance) => {
    if (Math.random() <= chance) {
        return true
    } else {
        return false
    }

}


String.prototype.allReplace = function (str) {
    let oriStr = this
    let replace = () => {
        if (oriStr != oriStr.replace(str, "*".repeat(str.length))) {
            oriStr = oriStr.replace(str, "*".repeat(str.length))
            replace()
        }
    }
    replace()
    return oriStr
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
    let save = readFileSync("c:/xampp/htdocs/WServer/saves/running/" + id + ".save")
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
console.log("Server started in " + String(performance.now()) + "ms");
import { createServer } from 'https';
import { appendFileSync, fstat, readFileSync, writeFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import util from "util"
import { appendFile, open, readFile, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
let gamesarr = getGames()
const server = createServer({
    cert: readFileSync('server.crt'),
    key: readFileSync('server.key'),
});

const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {
    console.log("New connection.");
    ws.send("Hello.")
    ws.on('message', function message(data) {
        let datamsg = util.format("%s", data)
        let dataarr = JSON.parse(datamsg)
        console.log('received: %s', datamsg);

        switch (dataarr[0]) {
            case "getgames":
                gamesarr = getGames()
                let dataToSend = ["gamelist", gamesarr]
                dataToSend = JSON.stringify(dataToSend)
                console.log(dataToSend);
                ws.send(dataToSend)
                break;
            case "creategame":
                let id = uuidv4()
                let dataToStore = [id,dataarr[1],"init","init"]
                dataToStore=JSON.stringify(dataToStore)
                appendFileSync("savesmap", dataToStore+"\n")
                writeFileSync("saves/" + id, `Started on ${new Date().toString()}\n`)
                break;
            case "gstart":

            break
            case "genter":

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
    let returndata = []
    let initdata = util.format("%s", readFileSync("savesmap"))
    let data = initdata.split("\n")
    for (let index = 0; index < data.length; index++) {
        const element = data[index];
        let line = []
        for (let index_ = 0; index_ < element.length; index_++) {
            const element_ = element[index_];
            line.push(element_)
        }
        returndata.push(line)
    }
    return returndata
}
const functions = require("firebase-functions");
const request = require("request-promise");
const dotenv = require("dotenv");
const env = dotenv.config().parsed;

exports.richMenu = functions.region("asia-southeast1").https.onRequest((request, response) => {
    // Define Rich MENU ID
    let richMenuId001 = env.RICH_MENU_ID001;
    let richMenuId002 = env.RICH_MENU_ID002;
    let richMenuId003 = env.RICH_MENU_ID003;
    let richMenuId004 = env.RICH_MENU_ID004;
    let richMenuId005 = env.RICH_MENU_ID005;
    let richMenuId006 = env.RICH_MENU_ID006;
    let richMenuId007 = env.RICH_MENU_ID007;

    if(request.body.uid !== undefined){
        linkRichMenu(request.body.uid, richMenuId001);
    } 
    else{
        let event = request.body.events[0];
        if(event.type === "postback"){
            switch(event.postback.data){
                case "toMainMenu": linkRichMenu(event.source.userId, richMenuId001); break;
                case "toTaeeMenu": linkRichMenu(event.source.userId, richMenuId002); break;
                case "toUserMenu": linkRichMenu(event.source.userId, richMenuId003); break;
                case "toTaeeSignalToType": linkRichMenu(event.source.userId, richMenuId004); break;
                case "toTaeeControlToType": linkRichMenu(event.source.userId, richMenuId005); break;
                case "toUserSignalToType": linkRichMenu(event.source.userId, richMenuId006); break;
                case "toUserControlToType": linkRichMenu(event.source.userId, richMenuId007); break;
                default: break;
            }
        }
    }
    response.status(200).send(request.method);
})

// link Rich menu to user
async function linkRichMenu(userId, richMenuId) {  
    await request.post({
        uri: `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`,
        headers: {
            Authorization: `Bearer ${env.ACCESS_TOKEN}`
        }
    });
}
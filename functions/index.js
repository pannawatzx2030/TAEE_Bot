"use strict"

// =================================== Program Setting ===================================
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { WebhookClient, Payload } = require("dialogflow-fulfillment");
const express = require("express");
const line = require("@line/bot-sdk");
const dotenv = require("dotenv");
const serviceAccount = require("./config/serviceAccountKey.json");
const message = require("./message");
const { postToDialogflow } = require('./dialogflow');
const request_promise = require("request-promise");

process.env.DEBUG = "dialogflow:*";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const env = dotenv.config().parsed;
const lineConfig = {
  channelAccessToken: env.ACCESS_TOKEN,
  channelSecret: env.CHANNEL_SECRET, 
};
const client = new line.Client(lineConfig);
// =================================== END Program Setting ===================================

// =================================== Main Program For DialogFlow Function ===================================
// =================================== Suggest to TAEE Function ===================================
async function suggestToTAEEConfirm(agent){
  console.log("Preparing for add to firestore");
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let sourceURL = agent.parameters.SourceURL;
  let contentOfCourse;
  let valid;
  console.log("course : ",course);
  console.log("content T : ",contentType);
  console.log("source :", sourceURL);
  console.log(">>>>> Agent.param.ContentOfCourse <<<<< : ", agent.parameters.ContentOfCourse);
  console.log(">>>>> Agent.param.ContentOfCourse KEY <<<<< : ", Object.keys(agent.parameters.ContentOfCourse)[0]);
  switch(course){
    case "Control Systems":
      if(Object.keys(agent.parameters.ContentOfCourse)[0] == "ContentOfControl"){
        contentOfCourse = agent.parameters.ContentOfCourse.ContentOfControl;
        valid = 0;
      }
      else{
        valid = 1;
      }
      break;
    case "Signals and Systems":
      if(Object.keys(agent.parameters.ContentOfCourse)[0] == "ContentOfSignal"){
        contentOfCourse = agent.parameters.ContentOfCourse.ContentOfSignal;
        valid = 0;
      }
      else{
        valid = 1;
      }
      break
    default:
      break;
  }
  const dataRef = db.collection("materialDatabase").doc(course).collection(contentType);
  console.log("Content C :", contentOfCourse);
  if(valid == 0){
    if(contentType == "Textbook"){
      dataRef.add({
        course: course,
        source: sourceURL,
        score: 0,
        view: 0,
        avgScore: 0,
        modified: admin.firestore.FieldValue.serverTimestamp() 
      });
    }
    else{
      dataRef.doc("data").collection(contentOfCourse).add({
        course: course,
        content: contentOfCourse,
        source: sourceURL,
        score: 0,
        view: 0,
        avgScore: 0,
        modified: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    console.log("Add doc success");
    await agent.add("??????????????????????????????????????????????????????????????? >^<");
  }
  else{
    console.log("Content doesn't match");
    await agent.add("??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????");
  }
}
// =================================== Suggest to User Function ===================================
async function suggestToUSERConfirm(agent){
  console.log("Preparing for load data from firestore");
  const limitdata = 1;
  let data, docId;
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let contentOfCourse;
  let valid, dataExist;
  var arrayOfData = [];
  console.log("course : ",course);
  console.log("content T : ",contentType);
  console.log(">>>>> Agent.param.ContentOfCourse <<<<< : ", agent.parameters.ContentOfCourse);
  console.log(">>>>> Agent.param.ContentOfCourse KEY <<<<< : ", Object.keys(agent.parameters.ContentOfCourse)[0]);
  switch(course){
    case "Control Systems":
      if(Object.keys(agent.parameters.ContentOfCourse)[0] == "ContentOfControl"){
        contentOfCourse = agent.parameters.ContentOfCourse.ContentOfControl;
        valid = 0;
      }
      else{
        valid = 1;
      }
      break;
    case "Signals and Systems":
      if(Object.keys(agent.parameters.ContentOfCourse)[0] == "ContentOfSignal"){
        contentOfCourse = agent.parameters.ContentOfCourse.ContentOfSignal;
        valid = 0;
      }
      else{
        valid = 1;
      }
      break
    default:
      break;
  }
  console.log("Valid : ", valid);
  const dataRef = db.collection("materialDatabase").doc(course).collection(contentType);
  console.log("Content C :", contentOfCourse);
  if(valid == 0){
    if(contentType == "Textbook"){
      const orderByAvgScore = await dataRef.orderBy("avgScore", "desc").limit(limitdata).get();
      if(orderByAvgScore.empty){
        console.log("No matching documents.");
        await agent.add("???????????????????????????????????????????????????????????????????????????????????????????????????????????????");
        return;
      }
      orderByAvgScore.forEach(doc => {
        console.log("doc.id : ", doc.id);
        arrayOfData.push([doc.id, doc.data().source]);
      });
    }
    else{
      const orderByAvgScore = await dataRef.doc("data").collection(contentOfCourse).orderBy("avgScore", "desc").limit(limitdata).get();
      if(orderByAvgScore.empty){
        console.log("No matching documents.");
        await agent.add("???????????????????????????????????????????????????????????????????????????????????????????????????????????????");
        return;
      }
      orderByAvgScore.forEach(doc => {
        console.log("doc.id : ", doc.id);
        arrayOfData.push([doc.id, doc.data().source]);
      });
    }
    // Random Data from arrayOfData
    let random = Math.floor(Math.random() * arrayOfData.length);
    console.log("Array : ", arrayOfData[random]);
    // Structure of data : arrayOfData[x][y] y = 0 : docId, y = 1 : sourceURL
    docId = arrayOfData[random][0];
    data = arrayOfData[random][1];
    let paramCtx = {docId};
    let ctx = {"name": "docidctx", "lifespan": 1, "parameters": {"docId": paramCtx}};
    agent.setContext(ctx);
    console.log("Set Context");
    let payload = new Payload(`LINE`, message.feedbackReview(data), {sendAsMessage: true});
    await agent.add(payload);
  }
  else{
    console.log("Content doesn't match");
    await agent.add("????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????");
  }
}
// =================================== Update Score Function ===================================
async function userReviewConfirm(agent){
  console.log("Preparing to update STAR in firebase");
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let contentOfCourse;
  switch (course) {
    case "Control Systems":
      contentOfCourse = agent.parameters.ContentOfCourse.ContentOfControl;
      break;
    case "Signals and Systems":
      contentOfCourse = agent.parameters.ContentOfCourse.ContentOfSignal;
      break
    default:
      break;
  }
  let docId = agent.parameters.DocId.docId;
  let score = agent.parameters.Score;
  const dataRef = db.collection("materialDatabase").doc(course).collection(contentType);
  console.log("Course : ", course);
  console.log("Content Type : ", contentType);
  console.log("Content C :", contentOfCourse);
  console.log("DocId : ", docId);
  console.log("Score : ", score);
  if(contentType == "Textbook"){
    const textRef = dataRef.doc(docId);
    try{
      const res = await db.runTransaction(async transaction => {
        const doc = await transaction.get(textRef);
        const newScore = doc.data().score + parseInt(score);
        const newView = doc.data().view + 1;
        const newAvgScore = newScore / newView;
        const newModified = admin.firestore.FieldValue.serverTimestamp();
        await transaction.update(textRef, {score: newScore, view: newView, avgScore: newAvgScore, modified: newModified});
      });
      console.log("Transaction success", res);
    } catch (error) {
      console.log("Transaction failed", error);
    }
  } 
  else{
    const textRef = dataRef.doc("data").collection(contentOfCourse).doc(docId);
    try{
      const res = await db.runTransaction(async transaction => {
        const doc = await transaction.get(textRef);
        const newScore = doc.data().score + parseInt(score);
        const newView = doc.data().view + 1;
        const newAvgScore = newScore / newView;
        const newModified = admin.firestore.FieldValue.serverTimestamp();
        await transaction.update(textRef, {score: newScore, view: newView, avgScore: newAvgScore, modified: newModified});
      });
      console.log("Transaction success", res);
    } catch (error) {
      console.log("Transaction failed", error);
    }
  } 
  agent.add("?????????????????????????????????????????????????????????????????????????????????");
}
// =================================== END Main Program For DialogFlow Function ===================================

// =================================== Handle Event Function ===================================
async function handleEvent(request, event) {
  console.log("Request : ", request.body);
  switch(event.type){
    case "message":
      switch(event.message.type){
        case "text": return handleText(request);
        case "sticker": return handleSticker(request);
      }
    case "postback": return handlePostback(request);
    default: throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}
// =================================== Handle Text ===================================
async function handleText(request) {
  return await postToDialogflow(request);
}
// =================================== Handle Sticker ===================================
async function handleSticker(request) {
  let random = Math.floor(Math.random() * (10894 - 10855 + 1)) + 10855
  return await client.replyMessage(request.body.events[0].replyToken, {
    type: "sticker",
    packageId: "789",
    stickerId: random.toString()
  });
}
// =================================== Handle Postback ===================================
function handlePostback(request) {
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
    switch(event.postback.data){
        case "toMainMenu": return linkRichMenu(event.source.userId, richMenuId001);
        case "toTaeeMenu": return linkRichMenu(event.source.userId, richMenuId002); 
        case "toUserMenu": return linkRichMenu(event.source.userId, richMenuId003);
        case "toTaeeSignalToType": return linkRichMenu(event.source.userId, richMenuId004); 
        case "toTaeeControlToType": return linkRichMenu(event.source.userId, richMenuId005); 
        case "toUserSignalToType": return linkRichMenu(event.source.userId, richMenuId006); 
        case "toUserControlToType": return linkRichMenu(event.source.userId, richMenuId007); 
        default: break; 
    }
  }
}
// =================================== linkRichMenu Function ===================================
async function linkRichMenu(userId, richMenuId) {  
  await request_promise.post({
      uri: `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`,
      headers: {
          Authorization: `Bearer ${env.ACCESS_TOKEN}`
      }
  });
}
// =================================== END Handle Event Function ===================================

// =================================== Fullfillment API ===================================
const appFulfillment = express();

appFulfillment.get("/test", (request, response) => {
  console.log("Hello From Firebase Functions !! (GET /test)");
  db.collection("materialDatabase").doc("Control Systems").collection("Textbook").add({
    course: "control",
    source: "www.test.com"
  }).then(doc => {
    console.log("Log : ", doc.id);
  });
});

appFulfillment.post("/webhook", line.middleware(lineConfig), (request, response) => {
  console.log("Hello From Firebase Functions !! (POST /webhook)");
  Promise.all(request.body.events.map(event => {
    return handleEvent(request, event);
  }))
  response.send(200);
});

appFulfillment.post("/fulfillment", (request, response) => {
  console.log("Hello From Firebase Functions !! (POST /fulfillment)");
  const agent = new WebhookClient( {request, response} );
  let intentMap = new Map();
  intentMap.set("Suggest To TAEE - yes", suggestToTAEEConfirm);
  intentMap.set("Suggest to User - yes", suggestToUSERConfirm);
  intentMap.set("Suggest to User - yes - score", userReviewConfirm);
  agent.handleRequest(intentMap);
});
// =================================== END Fullfillment API ===================================

exports.dialogflowFirebaseFulfillment = functions.region("asia-southeast1").https.onRequest(appFulfillment);

 
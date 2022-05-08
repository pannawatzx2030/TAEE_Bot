"use strict"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { WebhookClient, Payload } = require("dialogflow-fulfillment");
const express = require("express");
const line = require("@line/bot-sdk");
const dotenv = require("dotenv");
const serviceAccount = require("./config/serviceAccountKey.json");
const message = require("./message");
const richMenu = require("./richMenu");

process.env.DEBUG = "dialogflow:*";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const env = dotenv.config().parsed;
const lineConfig = {
  channelAccessToken: env.ACCESS_TOKEN,
  channelSecret: env.SECRET_TOKEN, 
};

const client = new line.Client(lineConfig);

// Program Functions
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
    await agent.add("ขอบคุณที่สอนเราน้าาาา >^<");
  }
  else{
    console.log("Content doesn't match");
    await agent.add("เนื้อหากับวิชาไม่สอดคล้องกันช่วยสอนใหม่หน่อยนะ");
  }
}

async function suggestToUSERConfirm(agent){
  console.log("Preparing for load data from firestore");
  const limitdata = 1;
  let data, docId;
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let contentOfCourse;
  let valid;
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
      orderByAvgScore.forEach(doc => {
        console.log("doc.id : ", doc.id);
        arrayOfData.push([doc.id, doc.data().source]);
      });
    }
    else{
      const orderByAvgScore = await dataRef.doc("data").collection(contentOfCourse).orderBy("avgScore", "desc").limit(limitdata).get();
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
    // data out and send context
    let paramCtx = {docId};
    let ctx = {"name": "docidctx", "lifespan": 1, "parameters": {"docId": paramCtx}};
    agent.setContext(ctx);
    console.log("Set Context");
    let payload = new Payload(`LINE`, message.feedbackReview(data), {sendAsMessage: true});
    await agent.add(payload);
  }
  else{
    console.log("Content doesn't match");
    await agent.add("เนื้อหากับวิชาไม่สอดคล้องกันรบกวนขอใหม่หน่อยน้าา");
  }
}

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
  agent.add("ขอบคุณสำหรับการให้คะแนนนะคะ");
}

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
  try{
    console.log("Events >> ", request.body.events);
    console.log("Requset body >> ", JSON.stringify(request.body, null, 2));
    response.status(200).end();
  }
  catch(error){
    console.log("Error >> ", error);
    response.status(500).end();
  }
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

exports.dialogflowFirebaseFulfillment = functions.region("asia-southeast1").https.onRequest(appFulfillment);
exports.richMenu = richMenu.richMenu;


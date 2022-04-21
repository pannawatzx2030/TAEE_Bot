"use strict"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { WebhookClient, Payload } = require("dialogflow-fulfillment");
const express = require("express");
const line = require("@line/bot-sdk");
const dotenv = require("dotenv");
const serviceAccount = require("./config/serviceAccountKey.json");

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
  console.log("Content C :", contentOfCourse);
  if(contentType == "Textbook"){
    db.collection("materialDatabase").doc(course).collection(contentType).add({
      course: course,
      source: sourceURL
    });
  }
  else{
    db.collection("materialDatabase").doc(course).collection(contentType).doc("data").collection(contentOfCourse).add({
      course: course,
      content: contentOfCourse,
      source: sourceURL
    });
  }
  console.log("Add doc success");
  await agent.add("ขอบคุณที่สอนเราน้าาาา >^<");
}

async function suggestToUSERConfirm(agent){
  console.log("Preparing for load data from firestore");
  let data;
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
  console.log("Content C :", contentOfCourse);
  const dataRef = db.collection("materialDatabase").doc(course).collection(contentType);
  if(contentType == "Textbook"){
    const snapShot = await dataRef.get();
    snapShot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  }
  else{
    const snapShot = await dataRef.doc("data").collection(contentOfCourse).get();
    snapShot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  }
  // data out
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
  agent.handleRequest(intentMap);
});

exports.dialogflowFirebaseFulfillment = functions.region("asia-southeast1").https.onRequest(appFulfillment);
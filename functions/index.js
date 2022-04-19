"use strict"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { WebhookClient } = require("dialogflow-fulfillment");
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
function suggestToTAEEConfirm(agent){
  console.log("Preparing for add to firestore");
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let sourceURL = agent.parameters.SourceURL;
  let contentOfCourse = agent.parameters.ContentOfCourse;
  if(contentType == "Textbook"){
    return db.collection("materialDatabase").doc(course).collection(contentType).add({
      course: course,
      source: sourceURL
    }).then(doc => {
      console.log("Add doc ID >> " + doc.id);
      agent.add("Add doc success");
    });
  }
  else{
    return db.collection("materialDatabase").doc(course).collection(contentType).doc("data").collection(contentOfCourse).add({
      course: course,
      content: contentOfCourse,
      source: sourceURL
    }).then(doc => {
      console.log("Add doc ID >> " + doc.id);
    });
  }
}

function suggestToUSERConfirm(agent){
  console.log("Preparing for load data from firestore");
  let course = agent.parameters.Course;
  let contentType = agent.parameters.TypeOfSource;
  let contentOfCourse = agent.parameters.ContentOfCourse;
  const dataRef = db.collection("materialDatabase").doc(course).collection(contentType);
  if(contentType == "Textbook"){
    dataRef.doc("0znKXgZYWYk3h9OxbhrF").get().then(doc => {
      if(doc.exists){
        console.log("Doc data : ", doc.data());
        agent.add("Doc data");
      }
      else{
        console.log("Doc not found");
        agent.add("Doc Not found");
      }
    }).catch(error => {
      console.log("Error getting document:", error);
    });
  }
  else{
    console.log("Not Textbook");
    agent.add("Not Textbook");
  }
}

const appFulfillment = express();

appFulfillment.get("/test", (request, response) => {
  console.log("Hello From Firebase Functions !! (GET /test)");
  response.send("Hello From Firebase Functions !! (GET /test)");
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
  response.send("Hello From Firebase Functions !! (POST /fulfillment)");
  const agent = new WebhookClient( {request, response} );
  let intentMap = new Map();
  intentMap.set("Suggest To TAEE - yes", suggestToTAEEConfirm);
  intentMap.set("Suggest to User - yes", suggestToUSERConfirm);
  agent.handleRequest(intentMap);
});

exports.dialogflowFirebaseFulfillment = functions.region("asia-southeast1").https.onRequest(appFulfillment);
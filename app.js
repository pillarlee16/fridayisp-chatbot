/**
 * Copyright 2017-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * Starter Project for Messenger Platform Quick Start Tutorial
 *
 * Use this project as the starting point for following the 
 * Messenger Platform quick start tutorial.
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 */

'use strict';

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  path = require('path'),
  app = express().use(body_parser.json()); // creates express http server

const naver = require('./naver.js');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const port = process.env.PORT || 1337;

// Sets server port and logs message on success
app.listen(port, () => console.log('webhook is listening on ' + port));

app.use('/static', express.static(path.resolve(__dirname, 'static')));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      
      // Get the webhook event. entry.messaging is an array, but 
      // will only ever contain one event, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);
      
      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);
      
      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  const nlp = received_message.nlp;
  console.log(JSON.stringify(nlp));
  if (nlp && nlp.entities) {
    const entities = nlp.entities;
    const intent = entities.intent[0].value;
    if (intent === 'recommend') {
      const options = {
        category: entities.isp_category ? entities.isp_category[0].value : null,
      };
      handleNaverQuery(sender_psid, options);
      return;
    } else if (intent === 'welcome') {
      response = {
        "text": `Hello. This is "Friday Inspiration Bot".\nI can recommend you a good place in Seoul to inspire.\nAsk me anything!!\n\nFor example, just tell me. "Would you recommend? or recommend".\n\nIf you want to find a specific category,\nsay more detail like 'exhibit', 'musical', 'concert', 'drama', 'classic', 'kids'.`
      }
    }
  }

  if (!response) {
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'more') {
    handleNaverQuery(sender_psid);
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

async function handleNaverQuery(sender_psid, options) {
  const result = await naver.query(options);
  const total = result.length;
  const pick = Math.min(total, parseInt(Math.random() * 4) + 1);
  const idx = [];

  for (let i = 0; i < pick; i++) {
    let j = parseInt(Math.random() * total);
    while (idx.indexOf(j) >= 0) {
      j = parseInt(Math.random() * total);
    }
    idx.push(j);
  }

  const elements = [];
  for (let i = 0; i < idx.length; i++) {
    const item = result[idx[i]];

    elements.push({
      "title": item.title,
      "subtitle": item.place + ' / ' + item.duration,
      "image_url": item.imgSrc,
      "default_action": {
        "type": "web_url",
        "url": item.link,
      },
      "buttons": [
        {
          "type": "postback",
          "title": "More!",
          "payload": "more",
        },
      ],
    });
  }

  const response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": elements,
      }
    }
  };

  console.log(JSON.stringify(response));
  callSendAPI(sender_psid, response);
}
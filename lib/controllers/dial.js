'use strict';

var dial = exports;

var twilio = require('twilio');
var Slack = require('slack-node');

dial.user = function(req, res, next) {
  var domain = process.env.DOORMAN_DOMAIN;
  var defaultUser = process.env.DOORMAN_DEFAULT;
  var secrets = process.env.DOORMAN_SECRETS;
  var webhookUri = process.env.DOORMAN_SLACK_WEBHOOK;
  var slackChannel = process.env.DOORMAN_SLACK_CHANNEL

  var slack = new Slack();
  
  secrets = secrets? secrets.split(',') : [];

  if (webhookUri) {
    slack.setWebhook(webhookUri);
  }

  var notify = function(text, callback) {
    slack.webhook({
      channel: slackChannel,
      username: "doorman",
      icon_emoji: ":door:",
      text: slack_message
    }, callback);
  }

  var twiml = new twilio.TwimlResponse();
  var digits = req.body.Digits;

  notify("Someone is at the door trying to buzz in.");

  if (secrets && Array.isArray(secrets) && secrets.indexOf(digits) > -1) {
    var acceptDigit = process.env.DOORMAN_ACCEPT_DIGIT || 9;
    twiml.pause(1).play({digits: acceptDigit});

    notify("Someone with a secret code just buzzed in.");

    return res.end(twiml.toString());
  }

  var people = process.env.DOORMAN_USERS.split(',');
  var person = people[digits - 1] && people[digits - 1].split('@');

  // Allows you to set a default person to contact
  var usingDefault = false;
  if (!person && defaultUser) {
    usingDefault = true;
    person = defaultUser.split('@');
  }

  // If nobody is found, apologize and hangup
  if (!person) {
    twiml.say('We\'re sorry, we could not connect you. Please try again')
      .redirect(`${domain}/answer`);

    return res.end(twiml.toString());
  }

  var name = person[0];
  var number = person[1];

  var named = usingDefault? '' : ` to ${name}`;
  var greeting = `Please wait while we connect you${named}`;
  var defaultMsg = 'Sorry we are currently unavailable';
  var unavail = usingDefault? `${name} is currently unavailable` : defaultMsg;

  twiml.say(greeting)
    .dial(number)
    .say(unavail)
    .pause(2)
    .say('You will be redirect to the main menu.')
    .redirect(`${domain}/answer`);

  var slack_message = "Connecting guest to ${name}";
  notify(slack_message);

  res.end(twiml.toString());
};

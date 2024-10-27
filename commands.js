import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

import {getUsers} from './assets/builderservice.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

function userList() {
  const uList = getUsers();
  const userChoices = [];
  
  for (let user of uList) {
    if(user.globalName) {
      userChoices.push({
        name: capitalize(user.globalName || user.username),
        value: user.id.toLowerCase(),
      });
    }
  }
  
  return userChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};


// Command containing options
const BUILD_COMMAND = {
  name: 'c',
  description: 'Call city level',
  options: [
    {
      type: 10,
      name: 'striker',
      description: 'Striker percentage(e.g., 500 for 500%)',
      required: true,
    },
    {
      type: 3,
      name: 'troops',
      description: 'Troup count (e.g., 100g)',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

// Command to set builder
const SETBUILDER_COMMAND = {
  name: 'b',
  description: 'Set season builder',
  options: [
    {
      type: 3,
      name: 'builder',
      description: 'Choose the builder',
      required: true,
      choices: userList(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

// Initialize list of members
const INITUSERS_COMMAND = {
  name: 'initusers',
  description: 'initialize users',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, BUILD_COMMAND, SETBUILDER_COMMAND, INITUSERS_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);

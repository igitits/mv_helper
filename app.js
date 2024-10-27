import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import { setBuilder, getBuilder} from './assets/builderservice.js';

import fs from 'fs';

import cityData from './assets/cities.js';
import './assets/memberList.js';
import './assets/builder.js';

// Create a new client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(process.env.BOT_TOKEN)
  .then(() => console.log(`Logged in as ${client.user.tag}`))
  .catch(err => console.error('Failed to login:', err));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};


/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    }

    // "challenge" command
    if (name === 'challenge' && id) {
      // Interaction context
      const context = req.body.context;
      // User ID is in user field for (G)DMs, and member for servers
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
      // User's object choice
      const objectName = req.body.data.options[0].value;

      // Create active game using message ID as the game ID
      activeGames[id] = {
        id: userId,
        objectName,
      };

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: `Rock papers scissors challenge from <@${userId}>`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  // Append the game ID to use later on
                  custom_id: `accept_button_${req.body.id}`,
                  label: 'Accept',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
   
    // "b" command to request a city
    if (name === 'c') {
      const context = req.body.context;
      const builder = getBuilder();
      const striker = Number(req.body.data.options[0].value) / 100 ;
      const troops = req.body.data.options[1].value.toString();

      try {
        const troopCount = parseInt(troops.slice(0, -1));
        const unit = troops.slice(-1).toLowerCase();

        let category;
        switch(unit.toLowerCase()) {
          case 'g':
          case 't':
          case 'm':
          case 'p':
            category = unit;
            break;
          default: 
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                // Fetches a random emoji to send from a helper function
                content: 'Unable to process your request. Please correct your figures.',
              },
            });
        }

        if(cityData[category]) {
          const attackPower = ((troopCount * striker) + troopCount) / 100;

          let cityLevel;
          let previousCityDef = 0;
          let previousCity = 0;
          for(const city of cityData[category]) {
            if(attackPower > previousCityDef && attackPower < city.Defense ) {
              cityLevel = previousCity;
              break;
            }
            else if(attackPower == city.Defense) {
              cityLevel = city.Level;
              break;
            }
            previousCityDef = city.Defense;
            previousCity = city.Level;
          }

          if(cityLevel) {
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `${cityLevel}`
              }
            });
          } else {
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `No matching city level found for total defense of ${attackPower.toFixed(2)}.`
              }
            });
          }
        } else {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              //content: 'Invalid unit category.'
              content: `Unit Category: ${category}; city: ${cityData[category]}`
            }
          });
        }
             
      } catch (error) {
        console.error(error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'An error occurred while processing your request.'
          }
        });
      }
    }

    // "setbuilder" command
    if(name === 'b') {

      const chosenBuilder = req.body.data.options[0].value;
      setBuilder(chosenBuilder);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'Builder Saved!',
        },
      });
    }

    // "initusers" command
    if(name === 'initusers'){

      const guildId = req.body.guild_id; // Get the guild ID from the interaction
      
      try {
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch(); // Fetch all members

        const memberNames = members.map(member => member.user) // Get member globalName
                              .filter(name => name); // Filter out any undefined or empty names

        const content = `export const members = ${JSON.stringify(memberNames, null, 2)};\n`;
        
        // Save to a JavaScript file
        fs.writeFile('./assets/memberList.js', content, (err) => {
          if (err) {
            console.error('Error writing file:', err);
          } else {
            console.log('Successfully saved member names.');
          }
        });

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'List of users successfullly initialized.',
          },
        });
      } catch (error) {
        return console.error();
      }
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  /**
   * Handle requests from interactive components
   * See https://discord.com/developers/docs/interactions/message-components#responding-to-a-component-interaction
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;

    if (componentId.startsWith('accept_button_')) {
      // get the associated game ID
      const gameId = componentId.replace('accept_button_', '');
      // Delete message with token in request body
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
      try {
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'What is your object of choice?',
            // Indicates it'll be an ephemeral message
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    // Append game ID
                    custom_id: `select_choice_${gameId}`,
                    options: getShuffledOptions(),
                  },
                ],
              },
            ],
          },
        });
        // Delete previous message
        await DiscordRequest(endpoint, { method: 'DELETE' });
      } catch (err) {
        console.error('Error sending message:', err);
      }
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');

      if (activeGames[gameId]) {
        // Interaction context
        const context = req.body.context;
        // Get user ID and object choice for responding user
        // User ID is in user field for (G)DMs, and member for servers
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
        const objectName = data.values[0];
        // Calculate result from helper function
        const resultStr = getResult(activeGames[gameId], {
          id: userId,
          objectName,
        });

        // Remove game from storage
        delete activeGames[gameId];
        // Update message with token in request body
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

        try {
          // Send results
          await res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: resultStr },
          });
          // Update ephemeral message
          await DiscordRequest(endpoint, {
            method: 'PATCH',
            body: {
              content: 'Nice choice ' + getRandomEmoji(),
              components: [],
            },
          });
        } catch (err) {
          console.error('Error sending message:', err);
        }
      }
    }
    
    return;
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

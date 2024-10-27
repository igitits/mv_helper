import { members } from './memberList.js';
import { currBuilder } from './builder.js';
import fs from 'fs';

let users = members;
let builder = [];
let builderList = [];

export function setBuilder(b) {
    builder = getUserById(b);
    const content = `export const builder = ${JSON.stringify(builder, null, 2)};\n`;

    try {
        fs.writeFile('./assets/builder.js', content, (err) => {
            if (err) {
              console.error('Error writing file:', err);
            } else {
                console.log('Successfully saved new season builder.');
            }
        });
        
    } catch (error) {
        console.log(error);
    }
}

export function getBuilder(){
    builder.push({
        id: currBuilder.id,
        globalName: currBuilder.globalName,
    });

    return builder;
}

export function getUsers() {
    for(let u of users){
        builderList.push({
            id: u.id,
            globalName: u.globalName,
        });
    }
    return builderList;
}

function getUserById(id){
    getUsers();
    return builderList.find(user => user.id == id);
}

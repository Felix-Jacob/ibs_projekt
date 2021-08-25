var username;
var matchTopic;
var questions;

var dummyQuestions = [
    {a:2,b:3,c:4,d:5},
    {e:6,f:7,g:8,h:9}
];

window.onload = async function() { // Hub - perspective is loaded by default
    username = await authorize(); 

    if(!username)
        return;
        
    document.getElementById('username').innerHTML = username;

    await setupMQTT();

    document.getElementById('logout').addEventListener('click', onLogoutClicked);
}

function onLogoutClicked(){
    console.log('logout button pressed');
    let cookie = document.cookie;    
    document.cookie = cookie + '; expires=Thu, 18 Dec 2013 12:00:00 UTC';
    document.location.href = 'http://localhost:3000/login';
}

function setupMQTT() {
    client = new Paho.MQTT.Client("localhost", 8080, "/mqtt/", "quizHubClient");

    client.connect(
        {onSuccess: onConnectionSuccess},
        {onFailure: onConnectionFailure}
    )
}

function onConnectionSuccess() {
    console.log("sucessfully connected");
    client.onMessageArrived = onMessageArrived;
    switchToHub();
}

function onConnectionFailure(err) {
    console.log("connection failure: " + err);
    setTimeout(setupMQTT, 2000);
}

async function onMessageArrived(msg) {
    console.log("received message: " + msg.payloadString);

    var splittedMsg = msg.payloadString.split(' ');

    if(splittedMsg[0] == 'foundMatch') {
        matchTopic = splittedMsg[1]; 

        searchStatus.innerHTML = "Found a match! Waiting for you to join ..."
        stopSearchingButton.style.visibility='hidden';
        joinMatchButton.style.visibility='visible';
    }
    
    if(splittedMsg[0] == 'gameStart') {
        searchStatus.innerHTML = 'Game starts ...';
        console.log('game starts');
    }

    if(splittedMsg[0] == 'questions') {
        console.log(splittedMsg[1]);
        
        try {
            questions = JSON.parse(splittedMsg[1]);
        } catch {
            console.log('string couldnt be parsed into json');
        }

        publishMessage(0, 'quiz/'+matchTopic + '/server', 'questionsRecieved ' + username);
    }

    if(splittedMsg[0] == 'setRoles') { // TODO: besprechen
        if(splittedMsg[1] == 'gameMaster') {

            await switchToGameMaster();
            publishMessage(0, 'quiz/' + matchTopic + '/server', 'roleSet ' + username);

        }
        else {

            publishMessage(0, 'quiz/' + matchTopic + '/server', 'roleSet ' + username);
        }
    }
}

async function switchToGameMaster() {
    let result = await fetch('http://localhost:3000/gameMaster');
    let gameMasterView = await result.text();
    document.getElementById('view').innerHTML = gameMasterView;
    var questionDiv = document.getElementById('questions');

    for(i=0; i<dummyQuestions.length; i++) {
        console.log(JSON.stringify(dummyQuestions[i]));
        let question = JSON.stringify(dummyQuestions[i]);

        let selection = document.createElement("input");
        selection.id = i;
        selection.type = "radio";
        selection.name = "choices";
        selection.value = question;
        questionDiv.appendChild(selection);

        let label = document.createElement("label");
        label.for = selection.id;
        label.innerHTML = question;
        questionDiv.appendChild(label);
        questionDiv.appendChild(document.createElement('br'));
    }

    document.getElementById('0').checked = true;
    document.getElementById('confirmSelection').addEventListener('click', onConfirmSelectionClicked);
}

async function switchToPlayer() {
    
}

async function switchToHub() {
    let result = await fetch('http://localhost:3000/hub');
    let hubViewHtml = await result.text();
    document.getElementById('view').innerHTML = hubViewHtml;

    findGameButton = document.getElementById("findGame");
    findGameButton.addEventListener("click", onFindMatchClicked);
    stopSearchingButton = document.getElementById("stopSearching");
    stopSearchingButton.addEventListener("click", onStopSearchingClicked);
    joinMatchButton = document.getElementById('joinMatch');
    joinMatchButton.addEventListener('click', onJoinMatchClicked);
    searchStatus = document.getElementById('status');

    subscribe('quiz/joinGame/' + username, ()=>{});
}
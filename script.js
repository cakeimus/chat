const SUPABASE_URL = "https://dzhtqwakoiysscrhwmjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_D-otq-A20zDR8mXD18Ud2g_bxLg2L5M";

let supabaseClient = null;
let realtimeChannel = null;
let myPresence = {
  username: myUsername
};
let realtimeReady = false;

const rooms = [
  {name:"general", icon:"🌐", count:234},
  {name:"music", icon:"🎵", count:86},
  {name:"gaming", icon:"🎮", count:71},
  {name:"chill", icon:"💬", count:92},
  {name:"retro", icon:"📟", count:43},
  {name:"random", icon:"✨", count:38},
  {name:"tech", icon:"🖥️", count:31},
  {name:"art", icon:"🎨", count:27},
  {name:"midnight_radio", icon:"📻", count:19}
];

const people = [
  ["neonboy","◆"],["rexx","R"],["2004","04"],["nokia.exe","N"],["pixelkid","P"],
  ["starbyte","★"],["cyber_ash","C"],["guest_17","G"],["moonunit","M"],["void.txt","V"]
];

const starterMessages = [
  ["neonboy","yo what's up","16:42","◆"],
  ["rexx","nothing much, just hanging around","16:43","R"],
  ["2004","this interface is actually sick lol","16:44","04"],
  ["nokia.exe","welcome to the internet","16:45","N"],
  ["pixelkid","anyone listening to music rn?","16:46","P"]
];

const $ = s => document.querySelector(s);

const roomGrid = $("#roomGrid");
const roomSearch = $("#roomSearch");
const directory = $("#directory");
const chat = $("#chat");

let currentRoom = rooms[0];
const myUsername = "GUEST_" + Math.floor(Math.random() * 9999);


/* =========================
   ROOMS
========================= */

function renderRooms(filter=""){
  const f = filter.trim().toLowerCase();
  const shown = rooms.filter(r => r.name.includes(f));

  roomGrid.innerHTML = shown.map(r => `
    <button class="room" data-room="${escapeHtml(r.name)}">
      <span class="room-icon">${r.icon}</span>
      <span class="room-info">
        <span class="room-name">${escapeHtml(r.name)}</span>
        <span class="room-count">(${r.count})</span>
      </span>
    </button>
  `).join("");

  $("#roomCount").textContent = rooms.length;

  document.querySelectorAll(".room").forEach(el => {
    el.onclick = () => {
      openRoom(
        rooms.find(r => r.name === el.dataset.room)
      );
    };
  });
}


/* =========================
   PEOPLE
========================= */

function renderPeople(filter=""){
  const f = filter.trim().toLowerCase();

  $("#peopleList").innerHTML = people
    .filter(p => p[0].includes(f))
    .map(p => `
      <div class="person">
        <div class="avatar">${p[1]}</div>
        <span class="pname">${escapeHtml(p[0])}</span>
        <span class="pstatus"></span>
      </div>
    `)
    .join("");
}


/* =========================
   MESSAGES
========================= */

function renderMessages(){
  $("#messages").innerHTML =
    starterMessages.map(m => messageHTML(...m)).join("");

  $("#messages").scrollTop =
    $("#messages").scrollHeight;
}

function messageHTML(name,text,time,avatar){
  return `
    <div class="message">
      <div class="avatar">${avatar}</div>
      <div>
        <div class="message-head">
          ${escapeHtml(name)}
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text">
          ${escapeHtml(text)}
        </div>
      </div>
    </div>
  `;
}


/* =========================
   SUPABASE
========================= */

function connectSupabase(){

  try {

    if(
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ){
      console.warn("Supabase library unavailable.");
      return;
    }

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

    console.log("Supabase client ready.");

  } catch(error) {

    console.warn(
      "Supabase initialization failed:",
      error
    );

    supabaseClient = null;
  }
}


/* =========================
   OPEN ROOM
========================= */

async function openRoom(room){

  if(!room) return;

  currentRoom = room;

  $("#activeRoomIcon").textContent = room.icon;
  $("#activeRoomName").textContent = room.name;
  $("#chatRoomIcon").textContent = room.icon;
  $("#chatTitle").textContent = "# " + room.name;

  $("#memberCount").textContent =
    Math.max(
      2,
      Math.min(
        99,
        Math.round(room.count / 12)
      )
    );

  directory.classList.remove("active");
  chat.classList.add("active");

  renderPeople();
  renderMessages();

  realtimeReady = false;

  if(!supabaseClient){
    console.log("Room opened locally:", room.name);
    return;
  }

  try {

    if(realtimeChannel){
      await supabaseClient.removeChannel(
        realtimeChannel
      );

      realtimeChannel = null;
    }

    realtimeChannel =
      supabaseClient.channel(
        "room:" + room.name
      );
   

    realtimeChannel
      .on(
        "broadcast",
        { event: "message" },
        ({ payload }) => {

          if(
            !payload ||
            payload.username === myUsername
          ){
            return;
          }

          $("#messages").insertAdjacentHTML(
            "beforeend",
            messageHTML(
              payload.username,
              payload.text,
              payload.time,
              payload.avatar
            )
          );

          $("#messages").scrollTop =
            $("#messages").scrollHeight;
        }
      )
      realtimeChannel.on("presence", { event: "sync" }, () => {
  const state = realtimeChannel.presenceState();

  const onlineUsers = Object.values(state)
    .flat()
    .map(user => user.username);

  console.log("Online users:", onlineUsers);
});
      .subscribe(status => {

        console.log(
          "Room:",
          room.name,
          "Status:",
          status
        );

        if(status === "SUBSCRIBED"){
          realtimeReady = true;await realtimeChannel.track(myPresence);
        }

      });

  } catch(error) {

    console.warn(
      "Realtime room connection failed:",
      error
    );

    realtimeChannel = null;
    realtimeReady = false;
  }
}


/* =========================
   UTILITY
========================= */

function escapeHtml(s){
  return s.replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c])
  );
}


/* =========================
   SEARCH / NAVIGATION
========================= */

roomSearch.oninput =
  () => renderRooms(roomSearch.value);

$("#peopleSearch").oninput =
  e => renderPeople(e.target.value);

$("#backBtn").onclick = () => {
  chat.classList.remove("active");
  directory.classList.add("active");
};


/* =========================
   SEND MESSAGE
========================= */

async function send(){

  const input = $("#messageInput");
  const text = input.value.trim();

  if(!text) return;

  const now =
    new Date().toLocaleTimeString(
      [],
      {
        hour:"2-digit",
        minute:"2-digit"
      }
    );

  const message = {
    username: myUsername,
    text: text,
    time: now,
    avatar: "◆"
  };

  /* Show locally */
  $("#messages").insertAdjacentHTML(
    "beforeend",
    messageHTML(
      message.username,
      message.text,
      message.time,
      message.avatar
    )
  );

  $("#messages").scrollTop =
    $("#messages").scrollHeight;

  input.value = "";

  /* Send to other users */
  if(
    realtimeChannel &&
    realtimeReady
  ){

    try {

      await realtimeChannel.send({
        type: "broadcast",
        event: "message",
        payload: message
      });

    } catch(error) {

      console.warn(
        "Could not broadcast message:",
        error
      );
    }
  }
}

$("#sendBtn").onclick = send;

$("#messageInput").addEventListener(
  "keydown",
  e => {

    if(
      e.key === "Enter" &&
      !e.shiftKey
    ){

      e.preventDefault();
      send();

    }

  }
);


/* =========================
   CREATE ROOM
========================= */

const modal = $("#createModal");

$("#createBtn").onclick =
  () => modal.classList.remove("hidden");

$("#closeModal").onclick =
$("#cancelCreate").onclick =
  () => modal.classList.add("hidden");

$("#confirmCreate").onclick = () => {

  const name =
    $("#newRoomName")
      .value
      .trim()
      .replace(/\s+/g,"_")
      .toLowerCase();

  const icon =
    $("#newRoomIcon").value.trim() || "💬";

  if(!name) return;

  const room = {
    name,
    icon,
    count: 1
  };

  rooms.unshift(room);

  renderRooms(roomSearch.value);

  modal.classList.add("hidden");

  $("#newRoomName").value = "";

  openRoom(room);
};


/* =========================
   MICROPHONE
========================= */

let micStream = null;

$("#micBtn").onclick = async () => {

  if(micStream) return;

  try {

    micStream =
      await navigator.mediaDevices.getUserMedia({
        audio:true
      });

    $("#micStatus").classList.remove("hidden");

    $("#micBtn").textContent =
      "🎙 MIC ON";

    $("#micBtn").disabled = true;

  } catch(e) {

    alert(
      "Microphone permission was not granted. Your browser needs mic access for voice chat."
    );

  }
};

$("#stopMic").onclick = () => {

  if(micStream){
    micStream
      .getTracks()
      .forEach(t => t.stop());
  }

  micStream = null;

  $("#micStatus").classList.add("hidden");

  $("#micBtn").textContent =
    "🎙 MIC";

  $("#micBtn").disabled = false;
};


/* =========================
   START SITE FIRST
========================= */

renderRooms();
renderPeople();

/*
  IMPORTANT:
  The site is already rendered above.
  Supabase cannot prevent the rooms
  from appearing.
*/
connectSupabase();

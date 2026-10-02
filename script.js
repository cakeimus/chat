const SUPABASE_URL = "https://dzhtqwakoiysscrhwmjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_D-otq-A20zDR8mXD18Ud2g_bxLg2L5M";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase connected:", supabaseClient);
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
let realtimeChannel = null;
let realtimeReady = false;
let myUsername = "GUEST_" + Math.floor(Math.random() * 9999);
let onlineUsers = [];

function renderRooms(filter=""){
  const f = filter.trim().toLowerCase();
  const shown = rooms.filter(r => r.name.includes(f));
  roomGrid.innerHTML = shown.map(r => `
    <button class="room" data-room="${escapeHtml(r.name)}">
      <span class="room-icon">${r.icon}</span>
      <span class="room-info"><span class="room-name">${escapeHtml(r.name)}</span><span class="room-count">(${r.count})</span></span>
    </button>`).join("");
  $("#roomCount").textContent = rooms.length;
  document.querySelectorAll(".room").forEach(el => el.onclick = () => openRoom(rooms.find(r => r.name === el.dataset.room)));
}
function renderPeople(filter=""){
  const f=filter.trim().toLowerCase();
  const onlinePeople = onlineUsers.map(username => [username, "◆"]);
  $("#peopleList").innerHTML=onlinePeople.filter(p=>p[0].includes(f)).map(p=>`
    <div class="person"><div class="avatar">${p[1]}</div><span class="pname">${escapeHtml(p[0])}</span><span class="pstatus"></span></div>`).join("");
}
function renderMessages(){
  $("#messages").innerHTML = starterMessages.map(m => messageHTML(...m)).join("");
  $("#messages").scrollTop = $("#messages").scrollHeight;
}
function messageHTML(name,text,time,avatar,replyTo=null){
  return `<div class="message">
    <div class="avatar">${avatar}</div>
    <div>
      <div class="message-head">
        ${escapeHtml(name)}
        <span class="message-time">${time}</span>
        <button class="reply-btn" onclick="startReply('${escapeHtml(name)}','${escapeHtml(text)}')">REPLY</button>
      </div>
      ${replyTo ? `<div class="reply-preview">↳ ${escapeHtml(replyTo.name)}: ${escapeHtml(replyTo.text)}</div>` : ""}
<div class="message-text">${escapeHtml(text)}</div>
    </div>
  </div>`;
}
function startReply(name, text){
  replyingTo = {
    name: name,
    text: text
  };

  $("#replyText").textContent = "Replying to " + name + ": " + text;
  $("#replyBar").classList.remove("hidden");

  console.log("Replying to:", replyingTo);
}
  
async function openRoom(room){
  if(!room) return;

  currentRoom=room;

  $("#activeRoomIcon").textContent=room.icon;
  $("#activeRoomName").textContent=room.name;
  $("#chatRoomIcon").textContent=room.icon;
  $("#chatTitle").textContent="# "+room.name;
  $("#memberCount").textContent=Math.max(
    2,
    Math.min(99, Math.round(room.count/12))
  );

  directory.classList.remove("active");
  chat.classList.add("active");

  renderPeople();
  renderMessages();

  if(realtimeChannel){
    await supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel=null;
  }

 realtimeReady=false;

realtimeChannel=supabaseClient.channel("room:"+room.name);


  function updateOnlineUsers(users){
  console.log("Updating online users:", users);

  onlineUsers = users;
    renderPeople();
}
  
realtimeChannel.on("presence", { event: "sync" }, () => {
  console.log(
    "Online usernames:",
    Object.values(realtimeChannel.presenceState())
      .flat()
      .map(user => user.username)
  );
  renderPeople();

  updateOnlineUsers(
  Object.values(realtimeChannel.presenceState())
    .flat()
    .map(user => user.username)
);
  
});


 realtimeChannel
  .on("broadcast", { event: "message" }, ({ payload }) => {
    if(payload.username === myUsername) return;

    $("#messages").insertAdjacentHTML(
      "beforeend",
      messageHTML(
        payload.username,
        payload.text,
        payload.time,
        payload.avatar
      )
    );

    $("#messages").scrollTop=$("#messages").scrollHeight;
  })
  .subscribe(async status=>{
    if(status==="SUBSCRIBED"){
      realtimeReady=true;
      await realtimeChannel.track({ username: myUsername });
      console.log("Realtime connected to:", room.name);
    }
  });
}

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

roomSearch.oninput=()=>renderRooms(roomSearch.value);
$("#peopleSearch").oninput=e=>renderPeople(e.target.value);
$("#backBtn").onclick=()=>{chat.classList.remove("active");directory.classList.add("active")};

async function send(){
  const input=$("#messageInput");
  const text=input.value.trim();

  if(!text)return;

  const now=new Date().toLocaleTimeString([], {
    hour:"2-digit",
    minute:"2-digit"
  });

  const message={
    username:myUsername,
    text:text,
    time:now,
    avatar:"◆",
    replyTo:replyingTo
  };

  $("#messages").insertAdjacentHTML(
    "beforeend",
    messageHTML(
      message.username,
      message.text,
      message.time,
      message.avatar,
      message.replyTo
    )
  );

  input.value="";
  $("#messages").scrollTop=$("#messages").scrollHeight;

  if(realtimeChannel && realtimeReady){
    await realtimeChannel.send({
      type:"broadcast",
      event:"message",
      payload:message
    });
  }
}
$("#sendBtn").onclick=send;
$("#messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});

const modal=$("#createModal");
$("#createBtn").onclick=()=>modal.classList.remove("hidden");
$("#closeModal").onclick=$("#cancelCreate").onclick=()=>modal.classList.add("hidden");
$("#confirmCreate").onclick=()=>{
  const name=$("#newRoomName").value.trim().replace(/\s+/g,"_").toLowerCase();
  const icon=$("#newRoomIcon").value.trim()||"💬";
  if(!name)return;
  const room={name,icon,count:1}; rooms.unshift(room); renderRooms(roomSearch.value);
  modal.classList.add("hidden"); $("#newRoomName").value="";
  openRoom(room);
};

let micStream=null;
$("#micBtn").onclick=async()=>{
  if(micStream)return;
  try{
    micStream=await navigator.mediaDevices.getUserMedia({audio:true});
    $("#micStatus").classList.remove("hidden");
    $("#micBtn").textContent="🎙 MIC ON";
    $("#micBtn").disabled=true;
  }catch(e){
    alert("Microphone permission was not granted. Your browser needs mic access for voice chat.");
  }
};
$("#stopMic").onclick=()=>{
  if(micStream) micStream.getTracks().forEach(t=>t.stop());
  micStream=null; $("#micStatus").classList.add("hidden"); $("#micBtn").textContent="🎙 MIC"; $("#micBtn").disabled=false;
};

renderRooms(); renderPeople();
$("#cancelReply").onclick=()=>{
  replyingTo=null;
  $("#replyBar").classList.add("hidden");
};

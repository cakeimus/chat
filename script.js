const SUPABASE_URL = "https://dzhtqwakoiysscrhwmjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_D-otq-A20zDR8mXD18Ud2g_bxLg2L5M";
const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
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
let realtimeChannel = null;
let myUsername = "GUEST_01";

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
  $("#peopleList").innerHTML=people.filter(p=>p[0].includes(f)).map(p=>`
    <div class="person"><div class="avatar">${p[1]}</div><span class="pname">${escapeHtml(p[0])}</span><span class="pstatus"></span></div>`).join("");
}
function renderMessages(){
  $("#messages").innerHTML = starterMessages.map(m => messageHTML(...m)).join("");
  $("#messages").scrollTop = $("#messages").scrollHeight;
}
function messageHTML(name,text,time,avatar){
  return `<div class="message"><div class="avatar">${avatar}</div><div><div class="message-head">${escapeHtml(name)}<span class="message-time">${time}</span></div><div class="message-text">${escapeHtml(text)}</div></div></div>`;
}
async function openRoom(room){
  if(!room) return;

  // Leave the previous room's realtime channel
  if(realtimeChannel){
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  currentRoom=room;
  $("#activeRoomIcon").textContent=room.icon;
  $("#activeRoomName").textContent=room.name;
  $("#chatRoomIcon").textContent=room.icon;
  $("#chatTitle").textContent="# "+room.name;
  $("#memberCount").textContent=Math.max(2, Math.min(99, Math.round(room.count/12)));

  directory.classList.remove("active");
  chat.classList.add("active");

  renderPeople();
  renderMessages();

  // Create a realtime channel for this specific room
  realtimeChannel = supabase.channel("room:" + room.name);

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
    .subscribe();
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

roomSearch.oninput=()=>renderRooms(roomSearch.value);
$("#peopleSearch").oninput=e=>renderPeople(e.target.value);
$("#backBtn").onclick=()=>{chat.classList.remove("active");directory.classList.add("active")};

function async function send(){
  const input=$("#messageInput");
  const text=input.value.trim();

  if(!text || !realtimeChannel) return;

  const now=new Date().toLocaleTimeString([], {
    hour:"2-digit",
    minute:"2-digit"
  });

  const message = {
    username: myUsername,
    text: text,
    time: now,
    avatar: "◆"
  };

  // Show it immediately for yourself
  $("#messages").insertAdjacentHTML(
    "beforeend",
    messageHTML(
      message.username,
      message.text,
      message.time,
      message.avatar
    )
  );

  $("#messages").scrollTop=$("#messages").scrollHeight;
  input.value="";

  // Send it to everyone currently inside this room
  await realtimeChannel.send({
    type: "broadcast",
    event: "message",
    payload: message
  });
}{
  const input=$("#messageInput"), text=input.value.trim();
  if(!text)return;
  const now=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  $("#messages").insertAdjacentHTML("beforeend",messageHTML("GUEST_01",text,now,"◆"));
  input.value=""; $("#messages").scrollTop=$("#messages").scrollHeight;
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

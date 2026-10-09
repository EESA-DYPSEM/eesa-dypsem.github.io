import {auth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,updateProfile,deleteUser,doc,getDoc,getDocs,collection,query,where,setDoc,addDoc,serverTimestamp,db} from "./firebase.js";
import {getPublished} from "./services/content.js";
import {isPrivileged,getEffectiveRole} from "./firebase.js";
import {toast} from "./ui/toast.js";

const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let currentUser=null;

function setMessage(message,good=false){const el=$("auth-message");el.textContent=message;el.style.color=good?"var(--green)":"var(--danger)";}
function showLogin(){
  $("login-form").classList.remove("hidden");$("signup-form").classList.add("hidden");
  $("auth-eyebrow").textContent="Member access";$("auth-title").textContent="Your EESA space.";$("auth-intro").textContent="Sign in to see applications, registrations, projects and member-only notices.";setMessage("");
}
function showSignup(){
  $("login-form").classList.add("hidden");$("signup-form").classList.remove("hidden");
  $("auth-eyebrow").textContent="New student account";$("auth-title").textContent="Join EESA.";$("auth-intro").textContent="Create your student profile once. Your account will open with Student access.";setMessage("");
}
function normalizeUsername(value){
  return String(value||"").trim().toLowerCase().replace(/^@/,'');
}

function validUsername(username){
  return /^[a-z0-9._-]{3,24}$/.test(username);
}

function authErrorMessage(err, action="sign in"){
  const code=err?.code||"";
  const messages={
    "auth/invalid-credential":"The email/username or password is incorrect.",
    "auth/invalid-login-credentials":"The email/username or password is incorrect.",
    "auth/user-not-found":"No EESA account was found for that email or username.",
    "auth/wrong-password":"The password is incorrect.",
    "auth/invalid-email":"Please enter a valid email address or username.",
    "auth/too-many-requests":"Too many sign-in attempts. Please wait a little and try again.",
    "auth/network-request-failed":"Firebase could not connect. Check your internet connection, VPN, firewall, or browser privacy settings.",
    "auth/operation-not-allowed":"Email/password sign-in is not enabled in Firebase Authentication.",
    "auth/user-disabled":"This EESA account has been disabled.",
    "auth/email-already-in-use":"This email is already registered. Sign in instead.",
    "auth/weak-password":"Choose a stronger password (at least 6 characters)."
  };
  return messages[code]||`Could not ${action}. (${code||"unknown error"})`;
}

async function resolveLoginIdentity(identity){
  const value=String(identity||"").trim();
  // An @-prefixed value is explicitly a username. This must be checked
  // before the email test because usernames are displayed as @username.
  if(value.startsWith("@")){
    const username=normalizeUsername(value);
    if(!validUsername(username)) throw Object.assign(new Error("Invalid username"),{code:"auth/invalid-email"});
    const snap=await getDoc(doc(db,"usernames",username));
    if(!snap.exists()) throw Object.assign(new Error("Username not found"),{code:"auth/user-not-found"});
    const data=snap.data()||{};
    if(!data.email) throw Object.assign(new Error("Username index incomplete"),{code:"auth/internal-error"});
    return {email:data.email,username};
  }
  if(value.includes("@")) return {email:value};
  const username=normalizeUsername(value);
  if(!validUsername(username)) throw Object.assign(new Error("Invalid username"),{code:"auth/invalid-email"});
  const snap=await getDoc(doc(db,"usernames",username));
  if(!snap.exists()) throw Object.assign(new Error("Username not found"),{code:"auth/user-not-found"});
  const data=snap.data()||{};
  if(!data.email) throw Object.assign(new Error("Username index incomplete"),{code:"auth/internal-error"});
  return {email:data.email,username};
}

async function createStudentAccount(e){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target).entries());
  const username=normalizeUsername(data.username);
  if(!validUsername(username)){setMessage("Username must be 3–24 characters and use only letters, numbers, dots, underscores, or hyphens.");return}
  if(data.password!==data.confirm){setMessage("Passwords do not match.");return}
  if(data.password.length<6){setMessage("Password must be at least 6 characters.");return}
  try{
    const usernameRef=doc(db,"usernames",username);
    const usernameSnap=await getDoc(usernameRef);
    if(usernameSnap.exists()){setMessage("That username is already taken. Please choose another.");return}

    const email=data.email.trim().toLowerCase();
    const cred=await createUserWithEmailAndPassword(auth,email,data.password);
    try{
      await updateProfile(cred.user,{displayName:data.name.trim()});
      await setDoc(doc(db,"users",cred.user.uid),{
        uid:cred.user.uid,email,name:data.name.trim(),username,prn:data.prn.trim(),phone:data.phone.trim(),
        department:data.department.trim(),semester:data.semester,division:data.division.trim(),role:"student",
        notificationEnabled:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      });
      await setDoc(usernameRef,{uid:cred.user.uid,email,username,createdAt:new Date().toISOString()});
    }catch(innerErr){
      try{await deleteUser(cred.user)}catch{}
      throw innerErr;
    }
    setMessage("Account created successfully. Opening your EESA dashboard…",true);
  }catch(err){
    console.error("EESA account creation error:",err);
    setMessage(authErrorMessage(err,"create the account"));
  }
}

let publishedProjects=[], publishedEvents=[];

function openProjectSubmit(){ $("project-submit-dialog").classList.remove("hidden"); document.body.classList.add("modal-open"); }
function closeProjectSubmit(){ $("project-submit-dialog").classList.add("hidden"); $("project-submit-form").reset(); document.body.classList.remove("modal-open"); }
async function submitStudentProject(e){
 e.preventDefault();
 const data=Object.fromEntries(new FormData(e.target).entries());
 data.openRoles=data.openRoles?data.openRoles.split(",").map(x=>x.trim()).filter(Boolean):[];
 data.builders=(data.buildersText||"").split("\n").map(x=>x.trim()).filter(Boolean).map(x=>{const parts=x.split("—");return {name:(parts[0]||"").trim(),role:(parts.slice(1).join("—")||"").trim()}}).filter(x=>x.name);
 delete data.buildersText;
 data.status="pending";
 data.submittedBy=currentUser.uid;
 data.submitterName=currentUser.displayName||"EESA Member";
 data.submitterEmail=currentUser.email||"";
 data.createdAt=new Date().toISOString();
 await addDoc(collection(db,"projectSubmissions"),data);
 closeProjectSubmit();
 toast("Project submitted to EESA for review.");
}
async function render(){
  const [events,projects,notices]=await Promise.all([
    getPublished("events",20),getPublished("projects",20),getPublished("notices",20)
  ]);
  publishedEvents=events; publishedProjects=projects;
  $("dash-events").textContent=events.length;
  $("dash-projects").textContent=projects.length;
  $("dash-notices").textContent=notices.length;

  $("portal-events").innerHTML=events.map(e=>`
    <div class="stack-item">
      <div><strong>${esc(e.title)}</strong>
      <small>${esc(e.venue||"Campus")} • ${e.startAt?new Date(e.startAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"Date TBA"}</small>
      ${e.shortDescription?`<p>${esc(e.shortDescription)}</p>`:""}</div>
      <button class="btn ghost event-register" data-id="${esc(e.id)}">${e.registrationUrl?"Register":"Join event"}</button>
    </div>`).join("")||"<div class='notice'>No published events yet.</div>";

  $("portal-projects").innerHTML=projects.map(p=>`
    <div class="stack-item">
      <div>
        <strong>${esc(p.title)}</strong>
        <small>${esc((p.techStack||[]).join(" • ")||"Student project")}</small>
        ${(p.builders||[]).length?`<div class="builder-inline"><b>Builders:</b> ${(p.builders||[]).map(b=>`${esc(b.name)}${b.role?` (${esc(b.role)})`:""}`).join(", ")}</div>`:""}
        ${p.description?`<p>${esc(p.description)}</p>`:""}
      </div>
      <button class="btn ghost project-interest" data-id="${esc(p.id)}">Join project team</button>
    </div>`).join("")||"<div class='notice'>No published projects yet.</div>";

  $("portal-notices").innerHTML=notices.map(n=>`
    <div class="stack-item"><div><strong>${esc(n.title)}</strong>
    <small>${esc(n.category||"General")} ${n.pinned?"• Pinned":""}</small>
    ${n.body?`<p>${esc(n.body)}</p>`:""}</div></div>`).join("")||"<div class='notice'>No published notices yet.</div>";

  document.querySelectorAll(".project-interest").forEach(b=>b.onclick=()=>openProjectDialog(b.dataset.id));
  document.querySelectorAll(".event-register").forEach(b=>b.onclick=()=>registerForEvent(b.dataset.id));
  await loadMyActivity();
}

async function openProjectDialog(id){
  const p=publishedProjects.find(x=>x.id===id); if(!p) return;
  $("project-dialog-title").textContent=`Join ${p.title}`;
  $("project-dialog-info").textContent=(p.builders||[]).length
    ? `Current builders: ${(p.builders||[]).map(b=>b.name).join(", ")}`
    : "Tell the project team what you would like to contribute.";
  $("project-message").value="";
  $("project-interest-form").dataset.projectId=id;
  $("project-dialog").showModal();
}

async function submitProjectApplication(){
  const projectId=$("project-interest-form").dataset.projectId;
  const p=publishedProjects.find(x=>x.id===projectId); if(!p || !currentUser) return;
  const ref=doc(db,"projectApplications",`${projectId}_${currentUser.uid}`);
  const existing=await getDoc(ref);
  if(existing.exists()){ toast("You have already applied to this project."); $("project-dialog").close(); return; }
  await setDoc(ref,{
    projectId, projectTitle:p.title, applicantId:currentUser.uid,
    applicantName:currentUser.displayName||"EESA Member",
    message:$("project-message").value.trim(),
    status:"pending",createdAt:new Date().toISOString()
  });
  $("project-dialog").close();
  toast("Project application sent.");
  await loadMyActivity();
}

async function registerForEvent(id){
  const e=publishedEvents.find(x=>x.id===id); if(!e || !currentUser) return;
  if(e.registrationUrl){ window.open(e.registrationUrl,"_blank","noopener,noreferrer"); return; }
  const ref=doc(db,"eventRegistrations",`${id}_${currentUser.uid}`);
  const existing=await getDoc(ref);
  if(existing.exists()){ toast("You are already registered for this event."); return; }
  await setDoc(ref,{eventId:id,eventTitle:e.title,userId:currentUser.uid,status:"registered",registeredAt:new Date().toISOString()});
  toast("You're registered for this event.");
  await loadMyActivity();
}

async function loadMyActivity(){
  if(!currentUser) return;
  const [a,r]=await Promise.all([
    getDocs(query(collection(db,"projectApplications"),where("applicantId","==",currentUser.uid))),
    getDocs(query(collection(db,"eventRegistrations"),where("userId","==",currentUser.uid)))
  ]);
  $("my-applications").innerHTML=a.docs.map(d=>{
    const x=d.data(); return `<div class="stack-item"><div><strong>${esc(x.projectTitle||x.projectId)}</strong><small>Application • ${esc(x.status||"pending")}</small></div><span class="role-pill">${esc(x.status||"pending")}</span></div>`;
  }).join("")||"<div class='notice'>You haven't applied to a project yet.</div>";
  $("my-registrations").innerHTML=r.docs.map(d=>{
    const x=d.data(); return `<div class="stack-item"><div><strong>${esc(x.eventTitle||x.eventId)}</strong><small>Registration • ${esc(x.status||"registered")}</small></div><span class="role-pill">${esc(x.status||"registered")}</span></div>`;
  }).join("")||"<div class='notice'>You haven't registered for an event yet.</div>";
}

async function loadProfile(u){
  const snap=await getDoc(doc(db,"users",u.uid));const p=snap.exists()?snap.data():{};
  const fields=[['Name',p.name||u.displayName||'—'],['Username',p.username?`@${p.username}`:'Not set'],['PRN / Student ID',p.prn||'—'],['Account email',p.email||u.email||'—'],['Mobile',p.phone||'—'],['Department',p.department||'—'],['Semester',p.semester||'—'],['Division',p.division||'—'],['Access',p.role||'student']];
  $("profile-grid").innerHTML=fields.map(([k,v])=>`<div class="profile-item"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("");
  return p;
}
function bindClick(id, handler){const el=$(id);if(el)el.addEventListener("click",handler);}
bindClick("show-signup",showSignup);
bindClick("show-login",showLogin);
bindClick("submit-project",openProjectSubmit);
bindClick("close-project-submit",closeProjectSubmit);
bindClick("cancel-project-submit",closeProjectSubmit);
const projectSubmitDialog=$("project-submit-dialog");
if(projectSubmitDialog)projectSubmitDialog.addEventListener("click",e=>{if(e.target===projectSubmitDialog)closeProjectSubmit()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("project-submit-dialog")&&!$("project-submit-dialog").classList.contains("hidden"))closeProjectSubmit()});
const projectSubmitForm=$("project-submit-form");
if(projectSubmitForm)projectSubmitForm.onsubmit=async e=>{try{await submitStudentProject(e)}catch(err){console.error(err);toast("Could not submit the project. Please try again.")}};
bindClick("close-project-dialog",()=>$("project-dialog")?.close());
bindClick("cancel-project-dialog",()=>$("project-dialog")?.close());
const projectInterestForm=$("project-interest-form");
if(projectInterestForm)projectInterestForm.onsubmit=async e=>{e.preventDefault();try{await submitProjectApplication()}catch(err){console.error(err);toast("Could not send the application. Please try again.")}};
const projectDialog=$("project-dialog");
if(projectDialog)projectDialog.addEventListener("click",e=>{if(e.target===projectDialog)projectDialog.close()});
const loginButton=$("login");
if(loginButton)loginButton.onclick=async()=>{
  const button=loginButton;
  const identity=$("login-identity")?.value.trim()||"";
  const password=$("login-password")?.value||"";
  if(!identity||!password){setMessage("Enter your email/username and password.");return}
  button.disabled=true;button.textContent="Signing in…";
  try{
    setMessage("Connecting to EESA authentication…");
    const {email}=await resolveLoginIdentity(identity);
    await Promise.race([
      signInWithEmailAndPassword(auth,email,password),
      new Promise((_,reject)=>setTimeout(()=>reject(Object.assign(new Error("AUTH_TIMEOUT"),{code:"auth/network-request-failed"})),10000))
    ]);
    setMessage("");
  }catch(e){
    console.error("EESA sign-in error:",e);
    setMessage(authErrorMessage(e,"sign in"));
  }finally{
    button.disabled=false;button.textContent="Sign in";
  }
};
const signupForm=$("signup-form");
if(signupForm)signupForm.onsubmit=createStudentAccount;
bindClick("logout",()=>signOut(auth));

onAuthStateChanged(auth,async u=>{
  currentUser=u;
  if(!u){$("auth-card").classList.remove("hidden");$("portal-app").classList.add("hidden");showLogin();return}
  $("auth-card").classList.add("hidden");$("portal-app").classList.remove("hidden");
  try{
    const p=await loadProfile(u);const role=await getEffectiveRole(u.uid);
    const displayName=p.name||u.displayName||(p.username?`@${p.username}`:"Student");
    const firstName=String(displayName).trim().split(/\s+/)[0]||displayName;
    $("welcome").textContent=`Welcome back, ${firstName}`;
    $("role-line").textContent=`${p.username?`@${p.username} • `:""}${role.replace(/^committee:/,"Committee • ")}`;
    if(isPrivileged(role))$("committee-entry").classList.remove("hidden");
    await render();
  }catch(e){console.error(e);toast("Could not load your EESA dashboard.")}
});

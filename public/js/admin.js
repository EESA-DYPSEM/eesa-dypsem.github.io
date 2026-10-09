import {auth,onAuthStateChanged,getEffectiveRole,getCurrentCommitteeMember,db,doc,getDoc,getDocs,collection,query,orderBy,limit,setDoc,addDoc,updateDoc,serverTimestamp,signOut} from "./firebase.js";
import {getAll,createContent} from "./services/content.js";
import {toast} from "./ui/toast.js";

const $=id=>document.getElementById(id), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let currentUser=null,users=[],memberMap={},effectiveRole="student",currentMember=null,submissions=[],activeSubmission=null;
const dialog=$("content-dialog");
const positions=[
  ["president","President","manage_committee,manage_content,manage_events,manage_projects,manage_notices,manage_notifications,manage_quizzes,manage_settings"],
  ["vicePresident","Vice President","manage_content,manage_events,manage_projects,manage_notices"],
  ["secretary","Secretary","manage_content,manage_notices"],
  ["treasurer","Treasurer","manage_content"],
  ["technicalHead","Technical Head","manage_content,manage_projects,manage_quizzes"],
  ["eventHead","Event Head","manage_events,manage_notices"],
  ["publicityHead","Publicity / Media Head","manage_content"],
  ["member","Committee Member","manage_content"]
];
const positionLabels=Object.fromEntries(positions.map(([key,label])=>[key,label]));
const defaultSiteSettings={eyebrow:"Electrical Engineering Students Association",title:"Build. Connect. Electrify the future.",description:"A student-led platform for technical activities, projects, events, achievements and the people shaping Electrical Engineering at DYPSEM.",aboutTitle:"A student association built around doing.",aboutText:"EESA brings together students who want to learn by building, participate in technical activities, share ideas and create a stronger Electrical Engineering community.",institutionTitle:"Electrical Engineering at DYPSEM",institutionText:"D. Y. Patil School of Engineering & Management is an AICTE-approved constituent unit of D. Y. Patil Education Society (Deemed to be University), Kolhapur. The school offers B.Tech programs including Electrical Engineering and emphasizes modern infrastructure, industry-oriented learning and practical exposure.",contact:"D.Y. Patil Vidyanagar, Kasaba Bavada, Kolhapur 416006, Maharashtra"};
function fillSiteSettings(d={}){const x={...defaultSiteSettings,...d};$("site-eyebrow").value=x.eyebrow;$("site-title").value=x.title;$("site-description").value=x.description;$("site-about-title").value=x.aboutTitle;$("site-about-text").value=x.aboutText;$("site-institution-title").value=x.institutionTitle;$("site-institution-text").value=x.institutionText;$("site-contact").value=x.contact;}
async function loadSiteSettings(){try{const s=await getDoc(doc(db,"siteSettings","public"));fillSiteSettings(s.exists()?s.data():{});}catch(e){fillSiteSettings();}}
async function saveSiteSettings(){try{await setDoc(doc(db,"siteSettings","public"),{eyebrow:$("site-eyebrow").value.trim(),title:$("site-title").value.trim(),description:$("site-description").value.trim(),aboutTitle:$("site-about-title").value.trim(),aboutText:$("site-about-text").value.trim(),institutionTitle:$("site-institution-title").value.trim(),institutionText:$("site-institution-text").value.trim(),contact:$("site-contact").value.trim(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});toast("Homepage content published.");}catch(e){console.error(e);toast("Could not publish homepage content. You need manage_settings permission.")}}
$("save-site-settings").onclick=saveSiteSettings;

function fields(type){
 if(type==="event")return `<label>Event title<input name="title" required></label><label>Short description<textarea name="shortDescription"></textarea></label><label>Full description<textarea name="description"></textarea></label><label>Event type<select name="eventType"><option>Workshop</option><option>Competition</option><option>Technical event</option><option>Talk</option><option>Visit</option><option>Other</option></select></label><label>Start date/time<input name="startAt" type="datetime-local" required></label><label>End date/time<input name="endAt" type="datetime-local"></label><label>Venue<input name="venue"></label><label>Registration link<input name="registrationUrl" type="url"></label><label>Publish now<select name="status"><option value="draft">Save draft</option><option value="published">Publish</option></select></label>`;
 if(type==="project")return `
   <div class="form-section-title">Identity</div>
   <label>Project title<input name="title" required></label>
   <label>Project scale<select name="projectScale"><option value="micro">Micro Project</option><option value="mega">Mega Project</option></select></label>
   <label>Project category<select name="category"><option>Embedded Systems</option><option>Power & Energy</option><option>Automation</option><option>Renewable Energy</option><option>Electrical Machines</option><option>Power Electronics</option><option>IoT</option><option>Control Systems</option><option>EV / Mobility</option><option>Other</option></select></label>
   <label>Tagline<input name="tagline" placeholder="One sentence that explains the project"></label>
   <label>Description<textarea name="description" required></textarea></label>
   <div class="form-section-title">People</div>
   <label>Project builders / team members<textarea name="buildersText" placeholder="Name — role\nName — role\nName — role"></textarea></label>
   <div class="muted-note form-help">One builder per line. Example: Rahul Patil — Hardware Lead</div>
   <label>Faculty / industry mentor<input name="mentor"></label>
   <label>Open roles<input name="openRoles" placeholder="Embedded, PCB, Testing"></label>
   <div class="form-section-title">Technical details</div>
   <label>Problem statement<textarea name="problemStatement"></textarea></label>
   <label>Objectives<textarea name="objectives"></textarea></label>
   <label>Proposed solution<textarea name="solution"></textarea></label>
   <label>Key features<textarea name="features"></textarea></label>
   <label>Hardware / components<textarea name="hardware" placeholder="Arduino, sensors, contactors..."></textarea></label>
   <label>Software / firmware<textarea name="software" placeholder="Arduino IDE, MATLAB, Python..."></textarea></label>
   <label>Methodology<textarea name="methodology"></textarea></label>
   <div class="form-section-title">Results & practical information</div>
   <label>Expected / achieved outcomes<textarea name="outcomes"></textarea></label>
   <label>Innovation / uniqueness<textarea name="innovation"></textarea></label>
   <label>Applications<textarea name="applications"></textarea></label>
   <label>Estimated budget<input name="budget" placeholder="₹ 5,000"></label>
   <label>Project duration<input name="duration" placeholder="8 weeks"></label>
   <label>Academic year<input name="academicYear" placeholder="2026–27"></label>
   <label>Project status<select name="projectStatus"><option>Idea</option><option>In Development</option><option>Prototype Ready</option><option>Testing</option><option>Completed</option></select></label>
   <div class="form-section-title">Links & media</div>
   <label>GitHub / repository URL<input name="repositoryUrl" type="url"></label>
   <label>Demo / video URL<input name="demoUrl" type="url"></label>
   <label>Documentation URL<input name="documentationUrl" type="url"></label>
   <label>Visibility<select name="visibility"><option value="public">Public</option><option value="members">Members only</option></select></label>
   <label>Publish now<select name="status"><option value="draft">Save draft</option><option value="published">Publish</option></select></label>`;
 return `<label>Notice title<input name="title" required></label><label>Message<textarea name="body" required></textarea></label><label>Category<select name="category"><option>General</option><option>Event</option><option>Competition</option><option>Committee</option><option>Urgent</option></select></label><label>Priority<select name="priority"><option>normal</option><option>high</option></select></label><label>Pin to top<select name="pinned"><option value="false">No</option><option value="true">Yes</option></select></label><label>Publish now<select name="status"><option value="draft">Save draft</option><option value="published">Publish</option></select></label>`;
}
function normalize(form,type){
 const o=Object.fromEntries(new FormData(form).entries());
 if(type==="project"){
   o.techStack=o.techStack?o.techStack.split(",").map(x=>x.trim()).filter(Boolean):[];
   o.openRoles=o.openRoles?o.openRoles.split(",").map(x=>x.trim()).filter(Boolean):[];
   o.builders=(o.buildersText||"").split("\n").map(x=>x.trim()).filter(Boolean).map(x=>{const parts=x.split("—");return {name:(parts[0]||"").trim(),role:(parts.slice(1).join("—")||"").trim()}}).filter(x=>x.name);
   delete o.buildersText;
   o.projectScale=o.projectScale||"micro";
 }
 if(type==="notice")o.pinned=o.pinned==="true";
 if(type==="event"){if(o.startAt)o.startAt=new Date(o.startAt).toISOString();if(o.endAt)o.endAt=new Date(o.endAt).toISOString()}
 return o
}
function memberSearch(){const q=$("member-search").value.trim().toLowerCase();const filtered=users.filter(u=>[u.name,u.username,u.prn,u.department,u.semester,u.division].some(v=>String(v||"").toLowerCase().includes(q)));renderMembers(filtered)}
function roleLabel(uid){const m=memberMap[uid];return m?.position?positions.find(p=>p[0]===m.position)?.[1]||m.position:"Student"}
function renderMembers(list){
 $("members-list").innerHTML=list.map(u=>`<div class="member-row"><div class="member-avatar">${esc((u.name||u.username||"?").trim().slice(0,1).toUpperCase())}</div><div class="member-main"><strong>${esc(u.name||"Unnamed student")}</strong><small>${esc(u.prn||"No PRN")} • ${esc(u.semester||"Semester not set")} ${u.division?`• Div ${esc(u.division)}`:""}</small><small>${u.username?`@${esc(u.username)} • `:""}${u.department?esc(u.department):""}</small></div><span class="role-pill">${esc(roleLabel(u.uid))}</span></div>`).join("")||`<div class="notice">No registered students match your search.</div>`;
}
async function refresh(){
 const [events,projects,notices]=await Promise.all([getAll("events",10),getAll("projects",10),getAll("notices",10)]);
 const subSnap=await getDocs(query(collection(db,"projectSubmissions"),orderBy("createdAt","desc"),limit(20)));
 submissions=subSnap.docs.map(d=>({id:d.id,...d.data()}));
 $("admin-stats").innerHTML=[[events.length,"Events"],[projects.length,"Projects"],[notices.length,"Notices"],[users.length,"Members"]].map(x=>`<div class="admin-stat"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join("");
 const list=(arr,kind)=>arr.map(x=>`<div class="stack-item"><div><strong>${esc(x.title)}</strong><small>${esc(x.status||"draft")} • ${kind}${kind==="project"&&x.builders?.length?` • ${x.builders.length} builder${x.builders.length===1?"":"s"}`:""}</small></div></div>`).join("")||"<div class='notice'>Nothing here yet.</div>";
 $("admin-events").innerHTML=list(events,"event");$("admin-projects").innerHTML=list(projects,"project");$("admin-notices").innerHTML=list(notices,"notice");
 $("project-submissions").innerHTML=submissions.map(x=>{
  const st=x.status||"pending";
  const stClass=st==="approved"?"status-approved":st==="rejected"?"status-rejected":"status-pending";
  return `<div class="stack-item"><div><strong>${esc(x.title||"Untitled project")}</strong><small>${esc((x.projectScale||"micro").toUpperCase())} • ${esc(x.submitterName||"Student")}</small><small>${esc(x.category||"")}${x.builders?.length?` • ${x.builders.length} builder${x.builders.length===1?"":"s"}`:""}</small></div><div style="display:flex;align-items:center;gap:8px"><span class="status-pill ${stClass}">${esc(st)}</span><button class="btn ghost submission-preview" data-id="${esc(x.id)}">Review</button></div></div>`;
 }).join("")||"<div class='notice'>No student project submissions yet.</div>";
 document.querySelectorAll(".submission-preview").forEach(b=>b.onclick=()=>openSubmissionModal(b.dataset.id));
}
async function syncPublicCommittee(){
 const publicMembers=Object.entries(memberMap).map(([uid,m])=>{
   const u=users.find(x=>x.uid===uid);
   if(!u)return null;
   return {
     name:u.name||u.username||"EESA Member",
     position:m.position||"member",
     positionLabel:positionLabels[m.position]||m.position||"Committee Member",
     department:u.department||"Electrical Engineering",
     semester:u.semester||"",
     photoURL:u.photoURL||""
   };
 }).filter(Boolean);
 await setDoc(doc(db,"publicCommittee","current"),{
   members:publicMembers,
   updatedAt:serverTimestamp()
 });
 await setDoc(doc(db,"publicStats","current"),{
   memberCount:users.length,
   updatedAt:serverTimestamp()
 });
}

async function loadUsersAndCommittee(){
 const [us,cs]=await Promise.all([getDocs(collection(db,"users")),getDoc(doc(db,"committee","current"))]);
 users=us.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.role!=="superAdmin");
 memberMap=cs.exists()?(cs.data().members||{}):{};
 $("committee-fields").innerHTML=positions.map(([key,label,perms])=>{
   const selected=Object.entries(memberMap).find(([,m])=>m.position===key)?.[0]||"";
   const options=`<option value="">Unassigned</option>`+users.map(u=>`<option value="${esc(u.uid)}" ${u.uid===selected?"selected":""}>${esc(u.name||u.username||u.uid)}${u.prn?` — ${esc(u.prn)}`:""}</option>`).join("");
   return `<div class="committee-row"><label>${label}<select data-position="${key}" data-permissions="${perms}">${options}</select><div class="permission-note">${perms.split(",").join(" • ")}</div></label></div>`;
 }).join("");
 renderMembers(users);
 await syncPublicCommittee();
}
$("member-search").addEventListener("input",memberSearch);
$("save-committee").onclick=async()=>{
 try{
  const next={};document.querySelectorAll("#committee-fields select").forEach(s=>{if(s.value)next[s.value]={position:s.dataset.position,permissions:s.dataset.permissions.split(",")}});
  await setDoc(doc(db,"committee","current"),{members:next,updatedAt:serverTimestamp(),updatedBy:currentUser.uid},{merge:true});
  memberMap=next;await syncPublicCommittee();toast("Committee updated successfully.");await loadUsersAndCommittee();await refresh();
 }catch(e){console.error(e);toast("Committee save failed. Check your admin permissions.")}
};
function openContentModal(type){
 $("form-eyebrow").textContent=`Create ${type}`;
 $("form-title").textContent=`New ${type}`;
 $("form-fields").innerHTML=fields(type);
 dialog.dataset.type=type;
 $("content-dialog").classList.remove("hidden");
 document.body.classList.add("modal-open");
 setTimeout(()=>document.querySelector("#form-fields input, #form-fields textarea, #form-fields select")?.focus(),0);
}
function closeContentModal(){
 $("content-dialog").classList.add("hidden");
 $("content-form").reset();
 $("form-fields").innerHTML="";
 dialog.dataset.type="";
 document.body.classList.remove("modal-open");
}
document.querySelectorAll("[data-open-form]").forEach(b=>b.onclick=()=>openContentModal(b.dataset.openForm));
$("close-content-dialog").onclick=closeContentModal;
$("cancel-content-dialog").onclick=closeContentModal;
$("content-dialog").addEventListener("click",e=>{if(e.target.id==="content-dialog")closeContentModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("content-dialog").classList.contains("hidden"))closeContentModal()});
$("content-form").onsubmit=async e=>{
 e.preventDefault();
 const type=dialog.dataset.type;
 try{
   await createContent(type,normalize(e.target,type),currentUser);
   closeContentModal();
   toast(`${type} saved successfully.`);
   await refresh();
 }catch(err){console.error(err);toast("Save failed. Check the relevant committee permission.")}
};
$("admin-logout").onclick=()=>signOut(auth);

function openSubmissionModal(id){
 const sub=submissions.find(s=>s.id===id);
 if(!sub)return;
 activeSubmission=sub;
 $("submission-dialog-title").textContent=sub.title||"Untitled Project";
 $("submission-dialog-eyebrow").textContent=`${(sub.projectScale||"micro").toUpperCase()} PROJECT • REVIEW`;

 const st=sub.status||"pending";
 const stClass=st==="approved"?"status-approved":st==="rejected"?"status-rejected":"status-pending";
 const dateStr=sub.createdAt?new Date(sub.createdAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"Date unknown";

 const f=(label,val)=>val?`<div class="submission-field"><span class="submission-label">${esc(label)}</span><div class="submission-value">${esc(val)}</div></div>`:"";
 const buildersHtml=(sub.builders||[]).length
   ? `<div class="submission-field"><span class="submission-label">Builders</span><div class="submission-value">${(sub.builders||[]).map(b=>`${esc(b.name)}${b.role?` — ${esc(b.role)}`:""}`).join("<br>")}</div></div>`
   : "";

 const links=[];
 if(sub.repositoryUrl) links.push(`<a href="${esc(sub.repositoryUrl)}" target="_blank" rel="noopener noreferrer">Code / Repository ↗</a>`);
 if(sub.demoUrl) links.push(`<a href="${esc(sub.demoUrl)}" target="_blank" rel="noopener noreferrer">Live Demo / Video ↗</a>`);
 if(sub.documentationUrl) links.push(`<a href="${esc(sub.documentationUrl)}" target="_blank" rel="noopener noreferrer">Documentation ↗</a>`);

 $("submission-dialog-body").innerHTML=`
   <div class="submission-detail">
     <div class="submission-section">
       <h4>Submission Status & Submitter</h4>
       <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
         <span class="status-pill ${stClass}">${esc(st)}</span>
         <small style="color:var(--muted)">Submitted ${esc(dateStr)}</small>
       </div>
       ${f("Submitted By",`${sub.submitterName||"Student"}${sub.submitterEmail?` (${sub.submitterEmail})`:""}`)}
       ${sub.reviewedAt?f("Last Reviewed",new Date(sub.reviewedAt).toLocaleString("en-IN")):""}
     </div>
     <div class="submission-section">
       <h4>Overview</h4>
       ${f("Project Title",sub.title)}
       ${f("Scale",(sub.projectScale||"micro").toUpperCase()+" Project")}
       ${f("Category",sub.category)}
       ${f("Tagline",sub.tagline)}
       ${f("Description",sub.description)}
       ${buildersHtml}
       ${f("Faculty / Mentor",sub.mentor)}
       ${(sub.openRoles||[]).length?f("Open Roles",(sub.openRoles||[]).join(", ")):""}
       ${f("Project Stage",sub.projectStatus)}
       ${f("Academic Year",sub.academicYear)}
       ${f("Budget",sub.budget)}
       ${f("Duration",sub.duration)}
     </div>
     ${(sub.problemStatement||sub.objectives||sub.solution||sub.features||sub.hardware||sub.software||sub.methodology)?`
     <div class="submission-section">
       <h4>Technical Details</h4>
       ${f("Problem Statement",sub.problemStatement)}
       ${f("Objectives",sub.objectives)}
       ${f("Proposed Solution",sub.solution)}
       ${f("Key Features",sub.features)}
       ${f("Hardware / Components",sub.hardware)}
       ${f("Software / Firmware",sub.software)}
       ${f("Methodology",sub.methodology)}
     </div>`:""}
     ${(sub.outcomes||sub.innovation||sub.applications)?`
     <div class="submission-section">
       <h4>Outcomes & Applications</h4>
       ${f("Outcomes",sub.outcomes)}
       ${f("Innovation",sub.innovation)}
       ${f("Applications",sub.applications)}
     </div>`:""}
     ${links.length?`
     <div class="submission-section">
       <h4>Links</h4>
       <div class="submission-links">${links.join(" • ")}</div>
     </div>`:""}
   </div>`;

 $("approve-publish-submission").textContent=sub.status==="approved"?"Republish Project":"Approve & Publish";
 $("submission-dialog").classList.remove("hidden");
 document.body.classList.add("modal-open");
}

function closeSubmissionModal(){
 $("submission-dialog").classList.add("hidden");
 $("submission-dialog-body").innerHTML="";
 activeSubmission=null;
 document.body.classList.remove("modal-open");
}

async function approveSubmission(publishStatus="published"){
 if(!activeSubmission)return;
 const sub=activeSubmission;
 const btn=publishStatus==="published"?$("approve-publish-submission"):$("approve-draft-submission");
 btn.disabled=true;
 try{
   const projectData={
     title:sub.title||"Untitled Project",
     projectScale:sub.projectScale||"micro",
     category:sub.category||"Other",
     tagline:sub.tagline||"",
     description:sub.description||"",
     builders:sub.builders||[],
     mentor:sub.mentor||"",
     openRoles:sub.openRoles||[],
     problemStatement:sub.problemStatement||"",
     objectives:sub.objectives||"",
     solution:sub.solution||"",
     features:sub.features||"",
     hardware:sub.hardware||"",
     software:sub.software||"",
     methodology:sub.methodology||"",
     outcomes:sub.outcomes||"",
     innovation:sub.innovation||"",
     applications:sub.applications||"",
     budget:sub.budget||"",
     duration:sub.duration||"",
     academicYear:sub.academicYear||"",
     projectStatus:sub.projectStatus||"Completed",
     repositoryUrl:sub.repositoryUrl||"",
     demoUrl:sub.demoUrl||"",
     documentationUrl:sub.documentationUrl||"",
     visibility:"public",
     status:publishStatus,
     submittedBy:sub.submittedBy||"",
     submitterName:sub.submitterName||"",
     submissionId:sub.id,
     createdBy:currentUser.uid,
     updatedAt:serverTimestamp()
   };
   let projectId=sub.publishedProjectId;
   if(projectId){
     await updateDoc(doc(db,"projects",projectId),projectData);
   }else{
     projectData.createdAt=serverTimestamp();
     const ref=await addDoc(collection(db,"projects"),projectData);
     projectId=ref.id;
   }
   await updateDoc(doc(db,"projectSubmissions",sub.id),{
     status:"approved",
     publishedProjectId:projectId,
     reviewedBy:currentUser.uid,
     reviewedAt:new Date().toISOString()
   });
   closeSubmissionModal();
   toast(publishStatus==="published"?"Project approved and published.":"Project approved as draft.");
   await refresh();
 }catch(err){
   console.error("Submission approval error:",err);
   toast("Approval failed. Check manage_projects permission.");
 }finally{
   btn.disabled=false;
 }
}

async function rejectSubmission(){
 if(!activeSubmission)return;
 const sub=activeSubmission;
 const btn=$("reject-submission");
 btn.disabled=true;
 try{
   await updateDoc(doc(db,"projectSubmissions",sub.id),{
     status:"rejected",
     reviewedBy:currentUser.uid,
     reviewedAt:new Date().toISOString()
   });
   closeSubmissionModal();
   toast("Submission marked as rejected.");
   await refresh();
 }catch(err){
   console.error("Submission rejection error:",err);
   toast("Rejection failed. Check manage_projects permission.");
 }finally{
   btn.disabled=false;
 }
}

$("close-submission-dialog").onclick=closeSubmissionModal;
$("close-submission-view").onclick=closeSubmissionModal;
$("approve-publish-submission").onclick=()=>approveSubmission("published");
$("approve-draft-submission").onclick=()=>approveSubmission("draft");
$("reject-submission").onclick=rejectSubmission;
$("submission-dialog").addEventListener("click",e=>{if(e.target.id==="submission-dialog")closeSubmissionModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("submission-dialog").classList.contains("hidden"))closeSubmissionModal()});

onAuthStateChanged(auth,async u=>{
 currentUser=u;
 if(!u){$("admin-denied").classList.remove("hidden");return}
 try{
  const role=await getEffectiveRole(u.uid),member=await getCurrentCommitteeMember(u.uid);
  if(!(role==="admin"||role==="superAdmin"||member)){$("admin-denied").classList.remove("hidden");return}
  effectiveRole=role;currentMember=member;$("admin-app").classList.remove("hidden");$("admin-user").textContent=u.displayName||"Committee account";
  const permissions=new Set(member?.permissions||[]);const allAdmin=role==="admin"||role==="superAdmin";
  document.querySelectorAll("[data-open-form]").forEach(b=>{const p=b.dataset.openForm==="event"?"manage_events":b.dataset.openForm==="project"?"manage_projects":"manage_notices";b.classList.toggle("hidden",!allAdmin&&!permissions.has(p))});
  const projectAccess=allAdmin||permissions.has("manage_projects");
  $("approve-publish-submission")?.classList.toggle("hidden",!projectAccess);
  $("approve-draft-submission")?.classList.toggle("hidden",!projectAccess);
  $("reject-submission")?.classList.toggle("hidden",!projectAccess);
  const committeeAccess=allAdmin||permissions.has("manage_committee");
  const settingsAccess=allAdmin||permissions.has("manage_settings");
  $("save-site-settings").classList.toggle("hidden",!settingsAccess);
  $("site-settings-panel").classList.toggle("hidden",!settingsAccess);
  if(settingsAccess) await loadSiteSettings();
  $("save-committee").classList.toggle("hidden",!committeeAccess);$("committee-fields").closest(".committee-panel").classList.toggle("hidden",!committeeAccess);$("members-list").closest(".members-panel").classList.toggle("hidden",!committeeAccess);
  if(committeeAccess) await loadUsersAndCommittee(); else {$("admin-stats").innerHTML="";users=[];memberMap={};}
  await refresh();
 }catch(e){console.error(e);$("admin-denied").classList.remove("hidden");$("admin-denied").querySelector("p").textContent="Could not verify your committee permissions. Check Firebase Rules and your user profile."}
});

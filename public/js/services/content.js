import {db,collection,getDocs,query,where,limit,doc,addDoc,serverTimestamp,updateDoc} from "../firebase.js";

// Public queries intentionally avoid compound orderBy requirements so the site
// remains usable even before Firestore indexes are created.
export async function getPublished(type,n=6){
  try{
    const q=query(collection(db,type),where("status","==","published"),limit(Math.max(n,20)));
    const s=await getDocs(q);
    return s.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>timeValue(b.createdAt)-timeValue(a.createdAt)).slice(0,n);
  }catch(err){
    console.warn(`Could not load published ${type}:`,err);
    return [];
  }
}

export async function getAll(type,n=20){
  const s=await getDocs(query(collection(db,type),limit(n)));
  return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>timeValue(b.createdAt)-timeValue(a.createdAt));
}

export async function getPublicDoc(type,id){
  try{
    const {getDoc}=await import("../firebase.js");
    const s=await getDoc(doc(db,type,id));
    return s.exists()?s.data():null;
  }catch(err){console.warn(`Could not load ${type}/${id}:`,err);return null;}
}

export async function createContent(type,data,user){
  return addDoc(collection(db,type),{...data,status:data.status||"draft",createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
export async function updateContent(type,id,data){
  return updateDoc(doc(db,type,id),{...data,updatedAt:serverTimestamp()});
}
function timeValue(v){
  if(!v)return 0;
  if(typeof v.toMillis==="function")return v.toMillis();
  const t=new Date(v).getTime();
  return Number.isFinite(t)?t:0;
}

export function toast(message){
  const el=document.getElementById("toast"); if(!el)return;
  el.textContent=message;el.classList.add("show");
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2600);
}
// Simple API client for Apps Script Web App
export function apiClient(API_URL){
  async function call(action, data){
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({action, data})
    });
    const json = await res.json();
    if(!json.ok) throw new Error(json.data?.error || "API error");
    return json.data;
  }
  return { call };
}

export function saveConfig(key, val){ localStorage.setItem(key, val); }
export function loadConfig(key, fallback=""){ return localStorage.getItem(key) || fallback; }
export function fmtMonthYear(d=new Date()){
  const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${m}${d.getFullYear()}`;
}

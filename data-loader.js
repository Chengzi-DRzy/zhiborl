import { bootstrapComateManifest, ensureAuthorized, request } from '.capabilities/wps/core';
const FILE_ID='r8T2ifj8N1MRx9gPKdHmxx7Nv8C3NhNvY';
const pick=(obj,names)=>{const key=Object.keys(obj||).find(k=>names.some(n=>k.includes(n)));return key?obj[key]:''};
const text=v=>Array.isArray(v)?v.map(x=>typeof x==='object'?(x.text||x.value||x.name||''):x).join('、'):typeof v==='object'?(v?.text||v?.value||v?.name||''):String(v??'');
export async function loadSchedule(){
 bootstrapComateManifest({schema:'comate/v2',scopes:['kso.dbsheet.readwrite'],capabilities:{}});
 await ensureAuthorized();
 const schema=await request.get(`/v7/coop/dbsheet/${FILE_ID}/schema`);
 const sheet=(schema?.data?.sheets||[])[0]; if(!sheet) throw new Error('未找到排班数据表');
 const fields=sheet.fields||[]; const names=fields.map(f=>f.name); const find=(xs)=>fields.find(f=>xs.some(x=>f.name.includes(x)))?.id;
 const dateId=find(['日期','时间']); const newId=find(['抖音上新']); const eventId=find(['抖音活动']); const hostIds=fields.filter(f=>/主号|主播/.test(f.name));
 let all=[], token=''; do{const r=await request.post(`/v7/coop/dbsheet/${FILE_ID}/sheets/${sheet.id}/records`,{prefer_id:true,text_value:'text',page_size:100,page_token:token,show_fields_info:true});all.push(...(r?.data?.records||[]));token=r?.data?.page_token||''}while(token);
 return all.map(rec=>{const raw=JSON.parse(rec.fields||''); const date=text(raw[dateId]).slice(0,10).replaceAll('/','-'); let slot='晚场', host='', assist=''; const vals=hostIds.map(f=>[f.name,text(raw[f.id])]); const found=vals.find(([n])=>/早/.test(n)); if(found){slot='早场';host=found[1]} const mid=vals.find(([n])=>/午/.test(n)); if(mid){slot='中午场';host=mid[1]} const eve=vals.find(([n])=>/晚/.test(n)); if(eve){slot='晚场';host=eve[1]} return {date,slot,host,assist,new:text(raw[newId]),event:text(raw[eventId])};}).filter(x=>x.date);
}

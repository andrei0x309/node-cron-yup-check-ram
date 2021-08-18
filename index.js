
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'
import EosApi from 'eosjs-api';
import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('YUP Ram Checker DB Check Sync'));

app.listen(port, () => console.log(`YUP Ram Checker DB Check Sync listening at http://localhost:${port}`));



dotenv.config();
const TOKEN = process.env.TOKEN;
const supabase = createClient("https://lcspcmmpolegvalxkfsu.supabase.co", TOKEN)

// Enough for at least ~ one transaction
const mimimumRamRequired = 750; // YUP Protocol
// Enough for at least ~ two transaction
const mimimumRamRequiredManager = 400; // YUP ACC manager

// Main EOS
const rcpOptions = {
  httpEndpoint: 'https://eos.greymass.com:443', // default, null for cold-storage
  verbose: false, // API logging
  fetchConfiguration: {},
};

const eosApi = EosApi(rcpOptions);

const checkRam = async (supabase,interval) => {
  
  const { count, error } = await supabase.from('uptime-check-record').select('*', { count: 'exact', head: true });
  if(error){
    // Database error stop execution probably should ping a service worker to get notified
    clearInterval(interval);
    return;
  }

  if(count > 2000){
    const { data } = await supabase.from('uptime-check-record').select('id').select('*').order('check-date', { ascending: true }).limit(1);
    const id = data[0].id;
    await supabase.from('uptime-check-record').delete().lte('id',500+id);

    const  dataNoDel  = (await supabase
      .from('yup-status-settings')
      .select('*')
      .eq('id', 2)).data[0];
    let noDel = Number(dataNoDel.value);
    noDel+=500;
     await supabase.from('yup-status-settings').update({ value: noDel }).eq('id', 2);

  }
 
  const yupAccountInfo = await eosApi.getAccount('yupyupyupyup');
  const yupAccountInfoManager = await eosApi.getAccount('yupaccounts1');
 
  const ramOverUsedForYupProtocol = (yupAccountInfo.ram_quota - yupAccountInfo.ram_usage) < mimimumRamRequired;
  const ramOverUsedForYupManager = (yupAccountInfoManager.ram_quota - yupAccountInfoManager.ram_usage) < mimimumRamRequiredManager;


  if ( ramOverUsedForYupProtocol || ramOverUsedForYupManager ) {
      
  await supabase
  .from('uptime-check-record')
  .insert([
    { status: false }
  ])

  await supabase
  .from('yup-status-settings')
  .insert([
    { value: Date.now(),
      'value-json': {
        ramOverUsedForYupProtocol: ramOverUsedForYupProtocol,
        ramOverUsedForYupManager: ramOverUsedForYupManager,
      }
       }
  ])


  } else {
    
     await supabase
    .from('uptime-check-record')
    .insert([
      { status: true }
    ])
    
  }
  if (ramOverUsedForYupProtocol || ramOverUsedForYupManager) {
    const  dataNoOfFailedChecks  = (await supabase
      .from('yup-status-settings')
      .select('*')
      .eq('id', 3)).data[0];
      let noChecks = Number(dataNoOfFailedChecks.value);
      noChecks++
      await supabase.from('yup-status-settings').update({ value: noChecks }).eq('id', 1);
  } else {
  const  dataNoChecks  = (await supabase
    .from('yup-status-settings')
    .select('*')
    .eq('id', 1)).data[0];
  let noChecks = Number(dataNoChecks.value);
  noChecks++;
  }

}

let interval = setInterval(() => checkRam(supabase,interval), 75000);
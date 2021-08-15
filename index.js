
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
const mimimumRamRequired = 800;

// Main EOS
const rcpOptions = {
  httpEndpoint: 'https://eos.greymass.com:443', // default, null for cold-storage
  verbose: false, // API logging
  fetchConfiguration: {},
};

const eosApi = EosApi(rcpOptions);

const checkRam = async (supabase,interval) => {
  
  const { count, error } = await supabase.from('uptime-check-record').select('*', { count: 'exact', head: true })
  if(error){
    // Database error stop execution probably should ping a service worker to get notified
    clearInterval(interval);
    return;
  }

  if(count > 2000){
    const { data } = await supabase.from('uptime-check-record').select('id').order('uptime-check-record', { ascending: true }).limit(1);
    const id = data[0].id;
    await supabase.from('uptime-check-record').lte('id',500+id).delete();
  }
 
  const yupAccountInfo = await eosApi.getAccount('yupyupyupyup');

  if ((yupAccountInfo.ram_quota - yupAccountInfo.ram_usage) < mimimumRamRequired) {
      
  await supabase
  .from('uptime-check-record')
  .insert([
    { status: false }
  ])

  } else {
    
     await supabase
    .from('uptime-check-record')
    .insert([
      { status: true }
    ])
    
  }
  const { data } = await supabase
    .from('yup-ram-check')
    .select()
    .match('id', 1);
  let noChecks = Number(data[0].value);
  noChecks++;
  await supabase.from('yup-ram-check').match('id', 1).update({ value: noChecks });

}

let interval = setInterval(() => checkRam(supabase,interval), 75000);
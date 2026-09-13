/** All records in this module are invented test data, not bundled upstream codes. */
export function fixture() {
  return {
    format:'open-ir-remote',format_version:'1.0.0',record_kind:'example',id:'oir:example:synthetic',updated:'2026-09-13',
    remote:{name:'Synthetic handset',manufacturer:'Example',model:'Test model',variant:'test',device_types:['other']},locale:'en',
    defaults:{protocol:'NEC',carrier_hz:38000},
    commands:[
      {id:'power.toggle',labels:{en:'Power',fr:'Marche / arrêt'},signals:[{kind:'decoded',primary:true,source_complete:true,parameters:{address_hex:'0x0000',command_hex:'0x00FF',unsigned:4294967295,wide_hex:'0x0000FFFFFFFFFFFFFFFF'}}]},
      {id:'test.raw',labels:{en:'Raw example'},signals:[{kind:'raw',primary:true,source_complete:true,intro_us:[9000,-4500,560,-10000]}]}
    ],
    provenance:[{source_type:'contributor-capture',source_path:'synthetic:test',imported_at:'2026-09-13',rights:'Invented test fixture; no upstream data.'}],
    validation:{status:'imported-unverified',issues:['Synthetic example; not a captured or tested handset.']},
    extensions:{'example.vendor':{label:'Éclair e\u0301 💡',slot:4,enabled:true},'example.receiver.v1':{version:1,bindings:[{command_id:'power.toggle',slot:7,action:'toggle-light'}]}}
  };
}
export const header='functionname,protocol,device,subdevice,function\r\n';
export const csv=header+'"Power, \"\"main\"\"\nÉclair",NEC1,0001,-1,+002\r\nOther,NEC2,1,-1,2\r\nOther,NEC2,1,-1,2\r\n';
export const identity={id:'oir:example:import',remote:{name:'Unidentified test handset',manufacturer:'Unknown',model:'Unknown',variant:'Unverified',device_types:['other']},locale:'en',importedAt:'2026-09-13',sourcePath:'synthetic:test.csv',sourceRevision:'synthetic-v1',identityNotes:'Synthetic collection. The physical handset model is unknown.'};

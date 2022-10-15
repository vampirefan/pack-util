#!/usr/bin/evn node

// index.js
const { exec,execSync } = require('child_process');
const { resolve } = require('path');
const getPackageNames = new Promise((resolve,reject) => {
exec('npm list --all', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    return;
  }

  // the *entire* stdout and stderr (buffered)
  let packages = stdout.split('\n').filter(item=>!item.includes('deduped')).map(name=>{
    name.trimEnd()
    return name.substring(name.lastIndexOf(' ')+1)
  }
  )
  packages.splice(0,1)

 return resolve(packages)
})
})

getPackageNames.then(packages=>{
  // console.log(packages)
  // for(let i=0;i++;i<packages.length){
    // console.log('1')
    packages.forEach(package => {
      // console.log(`npm pack ${package} --pack-destination="./node_modules_pack"`)
         execSync(`npm pack ${package} --pack-destination="./node_modules_pack"`)
    });
    
 
  }
)

// exec('npm list --all', (err, stdout, stderr) => {
//   if (err) {
//     // node couldn't execute the command
//     return;
//   }

//   // the *entire* stdout and stderr (buffered)
//   let packages = stdout.split('\n').filter(item=>!item.includes('deduped')).map(name=>
//     name.substring(name.lastIndexOf(' ')+1)
//   )
//   packages.splice(0,1)
//   // console.log(packages)
  
// });

// .map(name=>
//     name.match(/[\w\d\.@]+/)[0]
//  )
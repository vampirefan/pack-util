#!/usr/bin/evn node

// index.js
const { exec } = require('child_process');
exec('npm list --all', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    return;
  }

  // the *entire* stdout and stderr (buffered)
  console.log(stdout.split('\n').filter(item=>!item.includes('deduped'))
  
  )
});

// .map(name=>
//     name.match(/[\w\d\.@]+/)[0]
//  )
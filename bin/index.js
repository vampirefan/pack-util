#!/usr/bin/env node

import { execa } from 'execa';
import { mkdirSync, readdirSync } from 'fs'
import { Command } from 'commander';

const program = new Command();

const getPackageNames = async () => {
  const { stdout } = await execa('npm', ['list','--all']);
  let packages = stdout.split('\n')
    .filter(item=>!item.includes('deduped'))//去掉重复包
    .map(name=> name.substring(name.lastIndexOf(' ')+1))//解析每行的包名称
    .filter(packageName=>packageName.length>0)//去掉空行
  packages.splice(0,1)//去掉首行路径字符串
  return packages
};

const packPackage= async(packageName)=>{
  const {stdout} = await execa('npm',['pack',packageName,'--pack-destination=./node_modules_pack'])
  return stdout
}

const publishPackage = async(packageName)=>{
  const {stdout} = await execa('npm',['publish','./node_modules_pack/'+packageName])
  return stdout
}

program
  .name('pack-util')
  .description('Pack all installed package in ./node_modules, and publish to Nexus self-hosted Registry.')
  .version('1.0.4');

program
  .command('pack')
  .description('Pack all installed package in ./node_modules')
  .action(() => {
    getPackageNames().then(packages=>{
      console.log(`Total ${packages.length} packages to be packed, please wait...`)
      mkdirSync('./node_modules_pack',{recursive:true})
      packages.forEach(packageName => {
        packPackage(packageName).then(stdout=>console.log(stdout))
      });
    })
  })

program
  .command('publish')
  .description('Publish all packed packages in ./node_modules_pack')
  .action(()=>{
    const packages = readdirSync('./node_modules_pack')
    // console.log('Publish all packed packages in ./node_modules_pack')
    // console.log(packages)
    packages.forEach(packageName => {
      publishPackage(packageName).then(stdout=>console.log(stdout))
    })
  })


program.parse();

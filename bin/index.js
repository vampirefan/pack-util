#!/usr/bin/env node

import { execa } from 'execa'
import { mkdirSync, readdirSync, createReadStream } from 'fs'
import { Command } from 'commander'
import inquirer from 'inquirer'
import FormData from 'form-data'

const program = new Command()

program
  .name('pack-util')
  .description('Pack all installed package in ./node_modules, and publish to Nexus self-hosted Registry.')
  .version('1.0.6')

const getPackageNames = async () => {
  const { stdout } = await execa('npm', ['list', '--all'])
  let packages = stdout.split('\n')
  packages.splice(0, 1)//去掉首行路径字符串
  return packages.filter(item => !item.includes('deduped'))//去掉重复包
    .map(name => {
      const nameRegex = /(\S+@.+)/g
      const nameParse = name.match(nameRegex)
      if (nameParse && nameParse.length > 0) return nameParse[0]
      else return ''
    })//解析每行的包名称
    .filter(packageName => packageName.length > 0)//去掉空行
}

// 利用 npm pack 在外网上对 dependencies 中的所有包打包。
const packPackage = async (packageName) => {
  const { stdout } = await execa('npm', ['pack', packageName, '--pack-destination=./node_modules_pack'])
  return stdout
}

// npm publish 会将解析打包的 package.json 中 publishConfig, 有的公共包如果设置了 { "registry": "https://registry.npmjs.org/" } , 会导致publish失败。
const publishPackage = async (packageName) => {
  const { stdout } = await execa('npm', ['publish', './node_modules_pack/' + packageName])
  return stdout
}

// 通过 nexus 的 components upload API 上传 npm 包，有时候会报 statusCode 500，暂不知道原因，重新上传即可。
const uploadPackage = async (packageName, options) => {
  const { host, repository, username, password } = options
  const form = new FormData()
  form.append('npm.asset', createReadStream('./node_modules_pack/' + packageName))
  // return form
  form.submit({
    hostname: new URL(host).hostname,
    port: new URL(host).port,
    path: `/service/rest/v1/components?repository=${repository}`,
    auth: `${username}:${password}`
  }, function (err, res) {
    if (res.statusCode > 200 && res.statusCode < 300) console.log(packageName)
    else console.log(`${packageName} : UPLOAD ERROR -- code ${res.statusCode} -- ${res.statusMessage}`)
  })
}

program
  .command('pack')
  .description('Pack all installed package in ./node_modules')
  .action(() => {
    getPackageNames().then(packages => {
      console.log(`Total ${packages.length} packages to be packed, please wait...`)
      mkdirSync('./node_modules_pack', { recursive: true })
      packages.forEach(packageName => {
        packPackage(packageName).then(stdout => {
          console.log(stdout)
        })
      })
    })
  })


program
  .command('upload')
  .description('Upload all packed packages in ./node_modules_pack to Nexus self-hosted Registry')
  .action(() => {
    const questions = [
      {
        type: 'input',
        name: 'host',
        message: 'Please input your Nexus url host (eg: http://xx.xx.xx.xx:xxxx): '
      },
      {
        type: 'input',
        name: 'repository',
        message: 'Please input your Nexus npm repository (eg: localNpm): ',
        default: 'localNpm'
      },
      {
        type: 'input',
        name: 'username',
        message: 'login to Nexus by username: ',
        default: 'admin'
      },
      {
        type: 'password',
        name: 'password',
        message: 'password: '
      },
    ]
    inquirer.prompt(questions).then(options => {
      const packages = readdirSync('./node_modules_pack')
      console.log(`Total ${packages.length} packages to be uploaded, please wait...`)
      packages.forEach(packageName => {
        uploadPackage(packageName, options)
      })
    })
  })

// program
//   .command('publish')
//   .description('Publish all packed packages in ./node_modules_pack')
//   .action(() => {
//     const packages = readdirSync('./node_modules_pack')
//     packages.forEach(packageName => {
//       publishPackage(packageName).then(stdout => console.log(stdout))
//     })
//   })

program.parse()

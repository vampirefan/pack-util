#!/usr/bin/env node

import { execa } from 'execa'
import { mkdirSync, readdirSync, createReadStream, createWriteStream, readFileSync } from 'fs'
import { Command } from 'commander'
import inquirer from 'inquirer'
import FormData from 'form-data'
import fetch from 'node-fetch'
import url from 'url'
import yaml from 'yaml'
import pLimit from 'p-limit'

const program = new Command()

program
  .name('pack-util')
  .description('Pack all installed package in ./node_modules, and publish to Nexus self-hosted Registry.')
  .version('3.1.0')


const limit = pLimit(10)
const getPackageInfos = async (packageManager) => {
  // 使用 yarn
  if (packageManager === 'yarn') {
    const fileData = readFileSync('./yarn.lock')
    return fileData.toString().split(/\r?\n/)
      .filter(line => line.startsWith('  resolved'))
      .map(line => line.substring(12, line.length - 1))
  }
  else if (packageManager === 'pnpm') {
    const fileData = readFileSync('./pnpm-lock.yaml', 'utf8')
    const pnpmLock = yaml.parse(fileData)
    // 直接使用 `packages` 下的键作为包名和版本
    const packages = Object.keys(pnpmLock.packages)
    return Array.from(new Set(packages)) // 去掉重复项
  }
  // 使用 npm
  else {
    const { stdout } = await execa('npm', ['list', '--all'])
    let packages = stdout.split('\n')
    packages.splice(0, 1) //去掉首行路径字符串
    packages = packages.filter(item => !item.includes('deduped')) // 去掉标记重复的包
      .map(name => {
        const nameRegex = /(\S+@.+)/g
        const nameParse = name.match(nameRegex)
        if (nameParse && nameParse.length > 0) return nameParse[0]
        else return ''
      }) // 解析每行的包名称
      .filter(packageName => packageName.length > 0) // 去掉空行
    return Array.from(new Set(packages)) // 去掉重复项
  }
}


var index = 0
// 利用 npm pack 在外网上对 dependencies 中的所有包打包。
// const packPackage = async (packageName) => {
//   const { stdout } = await execa('npm', ['pack', packageName, '--pack-destination=./node_modules_pack'])
//   index++
//   // console.log(`${index}: ${stdout}`)
//   process.stdout.clearLine()
//   process.stdout.cursorTo(0)
//   process.stdout.write(`${index}: ${stdout}`) // 在同一行打印处理进度
//   return stdout
// }

// 直接利用依赖包的下载地址进行下载
const downloadPackage = async (packageUrl) => {
  const urlObj = url.parse(packageUrl)
  const filename = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1)
  const fileStream = createWriteStream('./node_modules_pack/' + filename)
  let res
  try {
    res = await fetch(packageUrl)
  } catch (error) {
    console.error(`Failed to download package ${packageUrl}: ${error.message}`)
    return filename
  }
  if (!res?.ok) {
    console.error(`Failed to download package ${filename}: ${res.status} ${res.statusText}`)
    return filename
  } else {
    res.body.pipe(fileStream)
    await new Promise((resolve, reject) => {
      fileStream.on('finish', () => {
        fileStream.close()
        index++
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`${index}: ${filename}`) // 在同一行打印处理进度
        resolve(filename)
      })
      fileStream.on('error', reject)
    })
    return filename
  }
}

// 通过 nexus 的 components upload API 上传 npm 包，有时候会报 statusCode 500，暂不知道原因，重新上传即可。
const uploadPackage = async (packageName, options) => {
  const { host, repository, username, password } = options
  const form = new FormData()
  form.append('npm.asset', createReadStream('./node_modules_pack/' + packageName))
  form.submit({
    hostname: new URL(host).hostname,
    port: new URL(host).port,
    path: `/service/rest/v1/components?repository=${repository}`,
    auth: `${username}:${password}`
  }, function (err, res) {
    if (err) console.log(err.message)
    else {
      if (res.statusCode > 200 && res.statusCode < 300) {
        // upload success
        index++
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`${index}: ${packageName}`) // 在同一行打印处理进度
      }
      else console.log(`${packageName} : UPLOAD ERROR -- code ${res.statusCode} -- ${res.statusMessage}`) //打印上传失败的包
    }
  })
}

program
  .command('pack')
  .description('Pack all installed package in ./node_modules')
  .action(() => {
    const questions = [
      {
        type: 'list',
        name: 'packageManager',
        message: 'Please select your package manager:',
        choices: ['pnpm', 'yarn', 'npm'],
        default: 'pnpm'
      },
    ]
    inquirer.prompt(questions).then((options) => {
      getPackageInfos(options.packageManager).then(async (packages) => {
        console.log(`Total ${packages.length} packages to be packed, please wait...`)
        mkdirSync('./node_modules_pack', { recursive: true })
        if (options.packageManager === 'yarn') {
          const downloadTasks = packages.map((packageUrl) =>
            limit(() => downloadPackage(packageUrl))
          )
          await Promise.all(downloadTasks)
        } else {
          const { stdout } = await execa('npm', ['config', 'get', 'registry'])
          const registryUrl = stdout.endsWith('/') ? stdout : `${stdout}/`;
          const packTasks = packages.map((packageName) => {
            const atIndex = packageName.lastIndexOf('@')
            const fullname = packageName.substring(0, atIndex)
            const name = fullname.includes('/') ? fullname.split('/')[1] : fullname
            const version = packageName.substring(atIndex + 1)
            const packageUrl = `${registryUrl}${fullname}/-/${name}-${version}.tgz`;
            return limit(() => downloadPackage(packageUrl))
          })
          await Promise.all(packTasks)
        }
        console.log('\nAll packages are successfully packed in ./node_modules_pack!')
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
      for (const packageName of packages) {
        uploadPackage(packageName, options)
      }
    })
  })

program.parse()

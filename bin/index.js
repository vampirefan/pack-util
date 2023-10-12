#!/usr/bin/env node
import { execa } from 'execa'
import { mkdirSync, readdirSync, createReadStream, createWriteStream, readFileSync } from 'fs'
import { Command } from 'commander'
import inquirer from 'inquirer'
import FormData from 'form-data'
import fetch from 'node-fetch'
import url from 'url'

const program = new Command()

program
  .name('pack-util')
  .description('Pack all installed package in ./node_modules, and publish to Nexus self-hosted Registry.')
  .version('2.0.4')

const getPackageInfos = async (packageManager) => {
  if (packageManager === 'yarn') {
    const fileData = readFileSync('./yarn.lock')
    return fileData.toString().split(/\r?\n/)
      .filter(line => line.startsWith('  resolved'))
      .map(line => line.substring(12, line.length - 1))
  }
  else {
    const { stdout } = await execa('npm', ['list', '--all'])
    let packages = stdout.split('\n')
    packages.splice(0, 1)//去掉首行路径字符串
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

// 利用 npm pack 在外网上对 dependencies 中的所有包打包。
var index = 0
const packPackage = async (packageName) => {
  const { stdout } = await execa('npm', ['pack', packageName, '--pack-destination=./node_modules_pack'])
  index++
  // console.log(`${index}: ${stdout}`)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(`${index}: ${stdout}`) // 在同一行打印处理进度
  return stdout
}

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
        choices: ['yarn', 'npm'],
        default: 'npm'
      },
    ]
    inquirer.prompt(questions).then(options => {
      getPackageInfos(options.packageManager).then(async (packages) => {
        console.log(`Total ${packages.length} packages to be packed, please wait...`)
        mkdirSync('./node_modules_pack', { recursive: true })
        if (options.packageManager === 'yarn') {
          for (const packageUrl of packages) {
            await downloadPackage(packageUrl)
          }
        } else {
          for (const packageName of packages) {
            await packPackage(packageName)
          }
        }
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

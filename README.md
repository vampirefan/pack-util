# pack-util
打包工具，可以将 ./node_modules 中安装的包遍历后打包，并放在 ./node_modules_pack 文件夹中，然后批量发布到 nexus 搭建的 npm 私服上。
Pack all installed package in ./node_modules, and publish to Nexus hosted Registry.

## Install

```sh
npm install -g @fanwang/pack-util
```

## Usage: pack-util [command]

### Pack all installed package in ./node_modules
```sh
cd your_project
pack-util pack
```

###  Publish all packed packages in ./node_modules_pack
copy node_modules_pack along with your project.
1. change registry 
```sh
npm config set registry http://xx.xx.xx.xx:xxxx/repository/xxxx/
```
2. adduser
```sh
npm adduser -registry http://xx.xx.xx.xx:xxxx/repository/xxxx/
```
2. batch publish
```sh
cd your_project
pack-util publish
```

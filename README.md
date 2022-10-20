# pack-util
打包工具，可以在公网上将项目 ./node_modules 中安装的包遍历后打包，并放在 ./node_modules_pack 文件夹中，然后批量上传到 nexus 搭建的 npm 私服上。

Pack all installed package in ./node_modules, and publish to Nexus hosted Registry.

## Install

```sh
npm install -g @fanwang/pack-util
```

## Usage: pack-util [ pack | upload ]

如果使用控制台命令的时候提示电脑禁止运行脚本,用管理员身份运行 cmd 或者 vscode 等然后在命令行输入:

```
Set-ExecutionPolicy RemoteSigned
```

### 将所有 ./node_modules 中安装的包打包至 ./node_modules_pack
Pack all installed package in ./node_modules

```sh
cd your_project
pack-util pack
```

### 批量上传到 nexus 搭建的 npm 私服上
Upload all packed packages in ./node_modules_pack

1. 将 ./node_modules_pack 文件夹和你的项目一起拷贝至内网，然后执行上传。

Copy ./node_modules_pack along with your project.


```sh
cd your_project
pack-util upload
```

2. 输入参数

Input some params

```
? Please input your Nexus url host (eg: http://xx.xx.xx.xx:xxxx): http://xx.xx.xx.xx:8081/
? Please input your Nexus npm repository (eg: localNpm):  localNpm
? login to Nexus by username:  admin
? password:  [hidden]
```

3. 如果出现上传失败，删除其他成功上传的包，然后重新执行上传。

If there is upload error, delete other packages within the ./node_modules_pack, and upload again.

## ！！注意：在私网上安装 npm 包需要忽略对 peer 依赖！！

```
npm install --save --legacy-peer-deps
```



###  ~~批量发布至 Nexus 搭建的 npm 私服上，Publish all packed packages in ./node_modules_pack~~

npm publish 会将解析打包的 package.json 中 publishConfig, 有的公共包如果设置了 { "registry": "https://registry.npmjs.org/" } , 会导致publish失败。[目前没法 Hack npm 的这种行为](https://stackoverflow.com/questions/66914753/override-registry-mentioned-in-publishconfig-of-package-json-through-command-lin)。

copy node_modules_pack along with your project.

1. change registry 

```sh
npm config set registry http://xx.xx.xx.xx:xxxx/repository/xxxx/
```
2. adduser

```sh
npm adduser -registry http://xx.xx.xx.xx:xxxx/repository/xxxx/
```

3. batch publish

```sh
cd your_project
pack-util publish
```


## TODO
- [] 实现打包和上传显示进度

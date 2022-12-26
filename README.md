# pack-util  

**中文** | [English](./README.en-US.md)  

一个打包工具，可以在互联网网机器上将项目 ./node_modules 中安装的包遍历后打包，并放在 ./node_modules_pack 文件夹中，并批量上传到 nexus 搭建的 npm 私服上。支持 `yarn` 和 `npm` 两种打包工具。

## 安装  

全局安装即可。
```sh
npm install -g @fanwang/pack-util
```

## 使用  

**使用说明**  

如果使用控制台命令的时候提示电脑禁止运行脚本,用管理员身份运行 cmd 或者 vscode 等然后在命令行输入:

```
Set-ExecutionPolicy RemoteSigned
```

建议先将源仓库设为阿里镜像仓库，这样打包速度更快：
```sh
npm config set registry https://registry.npmmirror.com  
```

### 第一步. 将所有 ./node_modules 中安装的包打包至 ./node_modules_pack 文件夹  
```sh
cd your_project
pack-util pack
# 选择所使用的包管理工具即可（ yarn | npm ）
```

### 第二步. 将依赖包批量上传到 nexus 搭建的 npm 私服上  
1. 将 ./node_modules_pack 文件夹和你的项目一起拷贝至内网机器上，然后执行上传。  
```sh
cd your_project
pack-util upload
```

2. 输入参数  

  ```
  ? Please input your Nexus url host (eg: http://xx.xx.xx.xx:xxxx): http://xx.xx.xx.xx:8081/
  ? Please input your Nexus npm repository (eg: localNpm):  localNpm
  ? login to Nexus by username:  admin
  ? password:  [hidden]
  ```

3. 如果出现上传失败，删除其他成功上传的包，然后重新执行上传（也可以直接重试上传）。  

### 第三步. 在内网机器上执行包依赖安装  
先删除 yarn.lock 或者 package-lock.json 文件。

**YARN**  
```
yarn config set registry http://xx.xx.xx.xx:xxxx/repository/localNpm/
yarn install
```

**NPM**  
```
npm config set registry http://xx.xx.xx.xx:xxxx/repository/localNpm/
npm install --save --legacy-peer-deps  # 注意：在私网上安装 npm 包需要忽略对 peer 依赖
```

## TODO
- [x] 实现打包和上传显示进度
- [x] 支持 yarn
- [ ] 支持 pnpm

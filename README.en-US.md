# pack-util

Pack all installed package in ./node_modules, and publish to Nexus hosted Registry. Support both `yarn` and `npm`.   

**English** | [中文](./README.md)  

## Install  

```sh
npm install -g @fanwang/pack-util
```

## Usage: pack-util [ pack | upload ]  
If power shell warning for forbidding running scripts, input command below as administrator:  
```
Set-ExecutionPolicy RemoteSigned
```

### Step 1. Pack all installed package in ./node_modules  

```sh
cd your_project
pack-util pack
# select your package manager ( yarn | npm )
```

### Step 2. Upload all packed packages in ./node_modules_pack  
1. Copy ./node_modules_pack along with your project.  
```sh
cd your_project  
pack-util upload  
```

2. Input some params  

  ```
  ? Please input your Nexus url host (eg: http://xx.xx.xx.xx:xxxx): http://xx.xx.xx.xx:8081/
  ? Please input your Nexus npm repository (eg: localNpm):  localNpm
  ? login to Nexus by username:  admin
  ? password:  [hidden]
  ```

3. If there is upload error, delete other packages within the ./node_modules_pack, and upload again.  

### Step 3. Install packages in LAN  
Remove yarn.lock or package-lock.json file.

**YARN**  
```
yarn config set registry http://xx.xx.xx.xx:xxxx/repository/localNpm/
yarn install
```

**NPM**  
```
npm config set registry http://xx.xx.xx.xx:xxxx/repository/localNpm/
npm install --save --legacy-peer-deps  # NOTE：NEED TO USE LEGACY PEER DEPS WHEN INSTALLING IN LAN
```

## TODO
- [x] show package and upload progress
- [x] support yarn
- [ ] support pnpm

# pack-util

Pack all installed package in ./node_modules, and publish to Nexus hosted Registry. Support `pnpm`/`yarn`/`npm`.   

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
# select your package manager ( pnpm | yarn | npm )
```
**Explain:**
`pack-util` retrieves all project dependencies based on the package manager you are using:
- **pnpm**: Retrieves dependencies from the `pnpm-lock.yaml` file.
- **yarn**: Retrieves dependencies from the `yarn.lock` file.
- **npm**: Retrieves dependencies from the output of `npm list --all`.

Therefore, if you simply want to download some packages from the internet, you can start with just a `package.json` file and use different package managers to execute `install`, which will generate the corresponding lock file. After that, you can perform the `pack` operation. You can even create an empty folder and use `yarn add` | `pnpm add` | `npm install` to add the packages you need, which will directly generate the lock file for retrieval.

### Step 2. Upload all packed packages in ./node_modules_pack  
1. Copy ./node_modules_pack along with your project.  
```sh
cd your_project  
pack-util upload  
```
**Explain:**
`pack-util` looks for the ./node_modules_pack folder in the command execution directory and then uploads the packages in the folder in batches. Therefore, you only need to copy the ./node_modules_pack folder to the command execution directory.

2. Input some params  
```
? Please input your Nexus url host (eg: http://xx.xx.xx.xx:xxxx): http://xx.xx.xx.xx:8081/
? Please input your Nexus npm repository (eg: localNpm):  localNpm
? login to Nexus by username:  admin
? password:  [hidden]
```

3. If there is upload error, delete other packages within the ./node_modules_pack, and upload again.  

### Step 3. Install packages in LAN  
Remove `yarn.lock` / `package-lock.json` / `pnpm-lock.yaml` file.

**PNPM**  
```
pnpm config set registry http://xx.xx.xx.xx:xxxx/repository/localNpm/
pnpm install
```

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


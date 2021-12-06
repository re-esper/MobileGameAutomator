# MobileGameAutomator
[![node version](https://img.shields.io/badge/node.js-%3E=_6-green.svg?style=flat)](http://nodejs.org/download/)

此项目是[Airtest](https://github.com/AirtestProject/Airtest)的轻量替代品, 它专门为移动游戏**长时间挂机**设计和优化, 制作初衷即为解决[Airtest](https://github.com/AirtestProject/Airtest)运行时系统资源占用过高的问题(尤其是安卓模拟器+重度游戏时)

相较[Airtest](https://github.com/AirtestProject/Airtest), 此项目:

改进点:
- 改进实现(缓存机制/截屏复用), 改变部分算法(RGB识图等), 脚本侧的CPU占用大幅减少
- Android端总能使用性能更好的minicap/minitouch(Airtest常常必须使用JavaCap), 并降低采集帧率, 设备侧的CPU占用明显减少

不足:
- 不支持iOS设备, 仅支持Android真机和模拟器
- 没有IDE(但可以借用AirtestIDE来辅助开发)

本项目为自制自用, 仅供参考

## Installation
```
npm install
```
## Running
真机(USB连接, 需启用ADB调试):
```
node app.js
```
模拟器:
```
node app.js 127.0.0.1:[port]
```
不同模拟器的端口号请参考: https://airtest.doc.io.netease.com/IDEdocs/device_connection/3_emulator_connection/<br>
对于BlueStacks模拟器, 需要将`設定->圖形->圖形引擎模式` 由 `效能` 修改为 `相容性`




## Examples
[My 4 Hearthstone:Mercenaries Scripts](https://github.com/re-esper/MobileGameAutomator/tree/main/examples)

## API
此框架的**API**大致与[Airtest](https://github.com/AirtestProject/Airtest)相同, 除未提供文字输入功能 (游戏挂机通常无此需求, 若一定需要可利用模拟器剪贴板实现)<br>
具体请参考: [engine.js](https://github.com/re-esper/MobileGameAutomator/blob/main/engine/engine.js)

## Third-party Libraries
- [opencv4nodejs](https://github.com/justadudewhohacks/opencv4nodejs)
- [minicap](https://github.com/DeviceFarmer/minicap)
- [minitouch](https://github.com/DeviceFarmer/minitouch)








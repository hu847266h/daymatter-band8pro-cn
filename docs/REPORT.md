# DayMatter 移植到国行小米手环 8 Pro — 最终报告

日期：2026-10-16
上游仓库：https://github.com/sf-yuzifu/daymatter
上游基线提交：deef2f230474863525426cda482a2653e855c7d5（分支 quickapp，版本 3.0 / versionCode 30001，GPL-3.0-or-later）
移植分支：port/xiaomi-band-8-pro-cn（提交 cfa7ba1）
工作目录：~/workspace/daymatter-band8pro-work/daymatter-band8pro

## 结论分级（只标实际达到的阶段）

| 阶段 | 状态 |
| --- | --- |
| A. 源码适配完成 | ✅ 完成（见下方修改清单） |
| B. 构建成功 | ✅ 调试构建成功；❌ 正式 release 构建未完成（缺上游作者 sign/ 私钥，见 C） |
| C. 安装包格式及签名有效 | ⚠️ 部分：RPK 格式完整、ZIP 结构校验通过、含 META-INF/CERT；签名为 aiot-toolkit 内置调试证书，不是作者发布签名，未在设备上验证可被国行固件接受 |
| D. 已在国行小米手环 8 Pro 上成功安装 | ❌ 未验证（无真机连接） |
| E. 已在真机上完成核心功能测试 | ❌ 未进行真机验证 |

## 可行性状态表

| 项目 | 状态 |
| --- | --- |
| 源码能否正常构建 | ✅ 已实际验证（基线与修改后均可构建 debug RPK；check 退出码 0；测试全过） |
| 是否存在目标设备适配问题 | ⚠️ 布局层：8 Pro 的 336×480 与上游主力方屏机型 9 Pro 同分辨率，上游已有完整 rect/band-rect 适配，本次补了固件上报归一；固件级差异（CSS/JS 引擎版本）未真机验证 |
| 国行固件是否支持安装 | ❌ 待实际验证。公开资料未证实国行固件存在可用的第三方 RPK 安装通道（详见下方"国行安装"一节） |
| 是否能获取合法的安装工具 | ⚠️ 有候选（AstroBox 社区工具、上游配套插件宿主；AIoT-IDE 调试链路），但其对"国行手环 8 Pro"的适用性均未得到公开文档明确确认 |
| 是否具备签名材料 | ❌ 无上游作者 release 私钥（sign/ 不随仓库分发）；产物使用工具链调试证书 |
| 是否可以真机调试 | ❌ 当前环境无手环、无配对手机连接 |

## 国行安装：已查明的事实

1. 没有官方侧载途径：面向国际版手环 8 Pro 的社区工具仓库（joaquimorg/xiaomi-band-development，原 oryonatan 仓库）明确写明其适用范围是国际固件，并称国际版也没有官方侧载方式，其方案借用国际版 Mi Fitness（包名 com.xiaomi.wearable）内的隐藏调试页安装 RPK。
2. 国行手机端是"小米运动健康"（包名 com.mi.health），与国际版 Mi Fitness 不是同一个应用；上述隐藏调试页路径不能直接认定适用于国行。这是国行安装最大的未验证点，需要你在手机上实测（见 INSTALL-CN.md 的实测清单）。
3. 上游 DayMatter 的手机端配套是 AstroBox 插件（Daymatter-AstroBox-Plugin），AstroBox 本身是国内社区的 Vela 设备工具；但公开检索未找到"AstroBox 明确支持国行手环 8 Pro 安装 RPK"的条目，不能假定兼容。
4. RPK 本身无设备/地区白名单：manifest.json 中只有 deviceTypeList: ["watch"]（Vela 穿戴统一类型，覆盖手环）、minPlatformVersion 1000、designWidth "device-width"，没有机型或地区限制字段。包名 com.yzf.daymatter 不变，插件/表盘协议不受影响。

## 源码分析要点

- 入口：src/app.ux 初始化设备画像（deviceProfile）、事件存储、表盘文件维护、背景存储；路由 6 页：index / list / edit / datepicker / ime / about（src/manifest.json)。
- 多屏机制（上游已有，本次复用未重写）：CSS 媒体查询 (shape: rect) 与 (device-type: band) and (shape: rect) 分布于全部 5 个内容页，公共样式 app.css 有 rect 规则；键盘页 ime.ux 有独立 rect 分支（按 global.screenShape/screenSize 运行时判定）；deviceProfile 在 rect+band 且无尺寸上报时兜底 336×480；背景裁剪表已收录 336×480（48px 圆角）。
- 官方多屏参数核对：用户给出的 8 Pro 336×480、DP 宽度 168 与公开规格（1.74" AMOLED 336×480）一致；manifest 使用 designWidth "device-width"，按固件上报的 DP 宽度自动缩放，未写死像素，参数适用性最终以固件上报为准。

## 设备 API 与依赖检查

| 能力 | 原项目实现 | 8 Pro 兼容情况 | 处理方式 |
| --- | --- | --- | --- |
| 倒数日管理 | eventStore + eventOrder，本地算法 | 纯 JS 逻辑，与机型无关；测试覆盖 | 保留 |
| 本地持久化 | @system.file 写 internal://files/events.json，tmp/bak 原子提交、失败回滚 | Vela 标准模块；test-store 模拟回归通过；真机文件行为未验证 | 保留 |
| 日期/农历 | dateUtils（公历、农历 dm-hko-v1 表、年度重复） | 纯 JS；test-date + 新增边界用例通过 | 保留 |
| 键盘输入 | 自研 IME（ime.ux），rect 分支 + T9/全键盘 | 模拟回归通过（test-ime、test-band8pro）；真机触控未验证 | 保留 |
| 表盘联动 | watchface.js 向表盘派生文件写主事件 | 协议本地回归通过（test-watchface）；8 Pro 上是否有对应 DayMatter 表盘可用未验证 | 保留，无表盘时不影响主功能 |
| 背景与布局 | backgroundStore 分片接收 + 按屏幕尺寸裁剪（含 336×480） | 本地回归通过（test-background）；固件图片显示未验证 | 保留 |
| 手机插件 | @system.interconnect + AstroBox 插件，hello 握手能力协商（API Level 4） | 协商机制保证未确认能力时降级/拒绝，不假定兼容；国行宿主往返未验证 | 保留协商与降级 |
| 系统模块 | manifest 声明 7 个：system.app/device/file/interconnect/prompt/router/vibrator | 均为 Vela 基础模块，源码 import 与声明一致，无多余权限 | 保留 |

## 本次修改（最小修改，3 个文件，+137/-2)

1. src/components/deviceProfile.js（+8 行）
   - 新增 isSquareBandPro 标记：实际上报为 336×480 rect 时为 true。
   - 若固件把该机型上报为 deviceType "watch"，JS 侧归一为 "band"，避免首页字号（calculateFontSize）、名称宽度（getNameMetrics）、页码偏移（144 vs 166）误走手表分支。手表 rect 兜底尺寸是 320×385，不受影响；CSS 的 (device-type: watch) 媒体查询由固件引擎判定，不受 JS 归一影响（已在注释中写明）。
2. tools/test-band8pro.cjs（新增，8 项测试）
   - 覆盖：标准上报、watch 上报归一、320×385 不误归一、信息失败兜底、无尺寸兜底、六页布局规则存在性、manifest 约束、闰年/跨年/农历边界。
3. package.json
   - 新增脚本 test:band8pro，并将其并入 npm test。

修改差异全文见同目录 port-diff.patch。

## 构建与测试结果（可复现）

环境：Node v24.20.0、npm 10.9.4、Yarn 1.22.22（本地安装于 ../yarn-local，系统无全局 yarn/corepack）、Linux VM。Windows 搭建说明见 INSTALL-CN.md。

基线（deef2f2，未装依赖）：
- npm test 失败 1 项：tools/test-ime.cjs 缺 pngjs（未装依赖所致，非源码缺陷）。
- yarn install --frozen-lockfile 成功（186s）后：npm run check 退出码 0；npm test 145/145 通过；npm run build 成功产出 debug RPK；npm run release 在打包阶段报错 "production mode certification path" 问题（缺 sign/），符合预期。

修改后（cfa7ba1）：
- npm run check：退出码 0（ESLint + 工程检查 + 格式检查）。
- npm test：153/153 通过（145 上游 + 8 新增）。
- npm run build：成功，产物 dist/com.yzf.daymatter.debug.3.0.rpk。
- npm run release：同基线，打包阶段因缺 sign/ 证书路径失败；aiot 进程退出码为 0 但日志明确 ERROR 且 dist 无 release 产物，不视为成功。
- tools/check-release-css.cjs 与 tools/artifact-info.cjs 默认写死旧版 release 文件名（release.2.1.rpk），对当前 3.0 产物需传参/改名才能用；其字节码检查面向 release 的 .jsc，本次 debug 产物为 .js，未强行套用，已如实记录。

产物校验：
- 文件：com.yzf.daymatter.debug.3.0.rpk（同时在本目录与仓库 dist/）
- 大小：216804 字节
- SHA-256：1dad786e822aec7e4f5bd102054a4d9433b03567d8db4652bc790591a383239e
- 结构：ZIP 完整性 testzip 通过；含 manifest.json（package com.yzf.daymatter，versionName 3.0，versionCode 30001，minPlatformVersion 1000，designWidth device-width）、6 个页面 JS、全部 common 资源与键盘素材、META-INF/CERT（7136 字节，工具链调试证书）、META-INF/build.txt；app.js 中可检出本次新增的 isSquareBandPro 代码，确认产物来自修改后源码。

复现命令：
```bash
yarn install --frozen-lockfile   # 或使用本地 yarn 1.22
npm run check
npm test
npm run build                    # 产物在 dist/
```

## 已知限制与未验证事项

- 未进行真机验证：没有国行手环 8 Pro 连接本环境，安装、启动、渲染、触控、文件持久化、插件往返、表盘联动均未在真机上跑过。
- 无模拟器验证：本 Linux 环境无 AIoT-IDE/Vela 模拟器，未做 336×480 模拟器预览；布局结论来自源码媒体查询与上游已有的 336×480 模拟回归（上游性能基线文档覆盖方屏 336×480 场景）。
- release 签名缺失：如需正式发布包，必须由上游作者提供 sign/ 材料或由你在 AIoT 平台以自己的开发者证书重新签名——届时包的签名身份与作者版不同，插件侧若校验签名需另行确认（未发现源码中有签名校验逻辑）。
- 国行安装通道未证实：见上文。这是 D/E 阶段的硬前置，需要你的手机+手环实测，清单在 INSTALL-CN.md。
- 版本号保持 3.0 未递增：避免影响插件握手与版本判断；若你要对外分发，建议在 manifest 与 package.json 同步改为 3.0.1-band8pro 之类并重跑 check（check-project 会校验两处版本一致）。

# 国行小米手环 8 Pro 安装说明与排错

适用产物：com.yzf.daymatter.debug.3.0.rpk（调试证书签名，见 REPORT.md 的 C 项说明）

## 先说清现状

- 小米没有提供面向手环 8 Pro 的官方第三方快应用侧载通道（国际版同样没有）。
- 国际版社区工具借助国际版 Mi Fitness（com.xiaomi.wearable）的隐藏调试页装 RPK，且明确只针对国际固件。国行手机端是小米运动健康（com.mi.health），该调试页在国行应用里是否存在、能否打开，没有公开资料证实。
- 因此国行安装的第一步不是装包，而是先在你自己的手机上做下面 10 分钟的实测，确认通道存在后再谈安装。

## 实测清单（需要你操作手机和手环）

1. 确认手环固件版本：手环 设置 → 关于，记录固件版本与型号（国行型号应为 M2303B1 一类，以实物为准）。
2. 确认手机端应用与版本：小米运动健康 → 我的 → 关于，记录版本号；确认手环已配对且可同步。
3. 在小米运动健康里找应用管理入口：设备页 → 应用商店/应用管理，看是否能看到已装应用列表、是否有"本地安装/调试"类入口。
4. 试 AstroBox：在手机安装 AstroBox（上游 DayMatter 插件的宿主），连接手环后看设备支持状态：能否列出手环 8 Pro、能否推送 RPK 文件。若 AstroBox 明确显示不支持该设备，记录提示原文并停止，不要换工具硬刷。
5. 若以上均无入口，结论就是国行当前无可用合法安装通道，本包只能保留源码与构建产物，等待通道出现（不要刷国际固件：那会改变设备地区与保修状态，且不在本任务范围内）。

## 若实测发现可用入口（任一通道走通时）

1. 把 com.yzf.daymatter.debug.3.0.rpk 传到手机（校验 SHA-256：1dad786e822aec7e4f5bd102054a4d9433b03567d8db4652bc790591a383239e）。
2. 在确认的入口里选择该 RPK 安装，包名 com.yzf.daymatter。
3. 安装后在手环应用列表打开"倒数日"，依次验证：
   首页显示与滑动切换 → 新建事件（中文长标题）→ 键盘输入 → 保存后退出重进看数据是否还在 → 编辑/删除 → 日期选择（含 2024-02-29 闰日）→ 列表页排序筛选 → 关于页。
4. 若安装了 AstroBox 插件：在插件里连接手环，验证事件同步、备份恢复、背景上传各一次。
5. 把每一步结果（成功/失败提示原文/截图）发回，我据此继续修。

## 安装失败排错

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 找不到任何本地安装入口 | 国行运动健康无隐藏调试页或版本不同 | 记录应用版本；改试 AstroBox 设备页；仍无则判定通道不存在（见上） |
| 选择 RPK 后无反应/格式不支持 | 入口只接受表盘文件（.bin/.face）而非快应用 | 该入口不是快应用通道，不要改扩展名强装 |
| 提示签名无效/证书错误 | 调试证书不被该通道接受 | 需要 release 签名：用你在 AIoT 平台申请的开发者证书在本机建 sign/ 后 npm run release（见下节）；或请上游作者出包 |
| 提示版本/平台过低 | 固件平台版本低于 minPlatformVersion 1000 的可能性低，更可能是通道误判 | 记录固件版本与完整提示，发回分析 |
| 安装成功但打开闪退 | 固件 JS/CSS 引擎与新语法不兼容 | 记录固件版本；把手环端日志（若通道提供）发回，我按日志降级语法/CSS |
| 打开后布局错位/顶部遮挡 | 固件上报的 screenShape/deviceType 与预期不同 | 截图 + 在"关于"页核对；本次已做 336×480 watch 上报归一，若仍错位需凭截图定位是 CSS 媒体查询分支问题 |
| 数据重启后丢失 | 固件文件 API 行为差异 | 记录复现步骤（新建→重启应用/重启手环），发回后查 eventStore 原子提交路径 |

## 用你自己的证书构建 release（可选）

1. 在小米 AIoT 开发者平台为包名 com.yzf.daymatter 创建/登记应用并下载签名材料（注意：这会使签名身份变成你的开发者身份，与作者版不同）。
2. 把材料放到仓库 sign/ 目录（该目录已被 .gitignore 排除，不要提交、不要打包进 ZIP）。
3. 运行 npm run release，产物 dist/com.yzf.daymatter.release.3.0.rpk；再运行 node tools/check-release-css.cjs dist/com.yzf.daymatter.release.3.0.rpk 检查字节码 CSS 属性。
4. 若 release 仍报 certification path 错误，检查 sign/ 内文件名与工具链要求是否一致（错误日志在打包阶段输出）。

## Windows 环境搭建（复现构建）

1. 安装 Node.js ≥18.18（建议 20/22 LTS，https://nodejs.org）。
2. 安装 Yarn 1：npm install -g yarn@1.22.22（或启用 corepack 后 corepack prepare yarn@1.22.22 --activate）。
3. git clone 本仓库并切到分支 port/xiaomi-band-8-pro-cn。
4. 在仓库目录执行：
   yarn install --frozen-lockfile
   npm run check
   npm test
   npm run build
5. 产物在 dist\ 目录。npm run start 是 aiot 调试服务，需要配合 AIoT-IDE/设备调试环境，单独运行不会自动装到手环。

## 本次交付内容

- 源码：daymatter-band8pro 仓库分支 port/xiaomi-band-8-pro-cn（提交 cfa7ba1），ZIP 内含同一源码快照（不含 node_modules、dist、build、sign）。
- 安装包：com.yzf.daymatter.debug.3.0.rpk（调试签名）。
- 报告：REPORT.md；差异：port-diff.patch；日志：baseline/ 与 results/ 目录（构建/测试原始输出）。

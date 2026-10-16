# DayMatter（倒数日）小米手环 8 Pro 移植

把开源快应用 [sf-yuzifu/daymatter](https://github.com/sf-yuzifu/daymatter)（GPL-3.0）
适配到小米手环 8 Pro（336×480 方形屏）的移植补丁包。

- 上游基线：`deef2f2`（v3.0，versionCode 30001）
- 移植提交：`cfa7ba1`（分支 `port/xiaomi-band-8-pro-cn`）
- 本仓库内容：完整补丁 `port-diff.patch`、改动后的完整源文件、移植报告与国行安装调研；
  应用本补丁到上游源码即可复现移植结果。

## 改了什么（3 个文件，+137 / −2）

1. `src/components/deviceProfile.js`：新增 `isSquareBandPro` 与设备画像归一逻辑——
   336×480 的方形设备即使固件把 deviceType 报成 `watch`，也按 `band` 处理，
   避免首页字号、名称宽度、分页偏移走错分支。
2. `tools/test-band8pro.cjs`：新增 8 项手环 8 Pro 适配回归测试，并入 `npm test`。
3. `package.json`：测试脚本接线（新增 `test:band8pro`）。

## 验证状态（如实分级）

| 阶段 | 状态 |
| --- | --- |
| A 源码移植 | ✅ 完成，`npm run check` 通过 |
| B 构建 | ✅ 测试 153/153 全过，debug RPK 构建成功（216804 B，工具链调试证书签名） |
| C 正式签名 | ⚠️ `npm run release` 需要上游作者 `sign/` 私钥，仓库中没有，未做也无法代签 |
| D 国行手环安装 | ❌ 未验证：公开资料未证实国行固件存在可用的 RPK 侧载通道（国际版工具针对国际固件 + 国际版 Mi Fitness，国行是小米运动健康 com.mi.health，不可直接套用） |
| E 真机功能测试 | ❌ 未做（无实测通道与设备验证记录） |

国行自测清单见 [docs/INSTALL-CN.md](docs/INSTALL-CN.md)，完整过程见 [docs/REPORT.md](docs/REPORT.md)。

## 构建

```bash
git clone https://github.com/sf-yuzifu/daymatter
cd daymatter
git checkout deef2f2
git apply port-diff.patch        # 本仓库的补丁
yarn install --frozen-lockfile
npm test                          # 153 项
npm run build                     # 产出 debug RPK（调试证书）
```

## 许可

GPL-3.0（见 `LICENSE`），与上游一致。原项目版权归 sf-yuzifu 及贡献者所有；
本仓库仅为移植补丁与文档的再分发，遵循 GPL-3.0 条款。

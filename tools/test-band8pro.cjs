// 小米手环 8 Pro（国行，336×480 方屏）适配回归。
// 只验证可由源码与模拟设备信息确定的行为：设备画像归一、布局规则存在性、
// manifest 约束与日期边界；不能替代国行固件真机安装与渲染验证。
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const {test} = require("node:test")

const root = path.resolve(__dirname, "..")

function loadModule(source, bindings) {
  const context = vm.createContext({...bindings, module: {exports: {}}})
  const script = source.replace(/^import .*$/gm, "").replace(/export default/, "module.exports =")
  vm.runInContext(script, context)
  return context.module.exports
}

const profileModule = loadModule(
  fs.readFileSync(path.join(root, "src/components/deviceProfile.js"), "utf8"),
  {}
)

function resolveProfile(info) {
  const target = {}
  let request
  profileModule.createDeviceProfile(
    {
      getInfo(options) {
        request = options
      }
    },
    target
  )
  if (info === null) request.fail("failed", 300)
  else request.success(info)
  return target
}

test("8 Pro 标准上报：rect + band + 336×480 命中方屏手环画像", () => {
  const target = resolveProfile({screenShape: "rect", deviceType: "band", screenWidth: 336, screenHeight: 480})
  assert.equal(target.screenShape, "rect")
  assert.equal(target.isPillShaped, false)
  assert.equal(target.deviceType, "band")
  assert.equal(target.screenSize.width, 336)
  assert.equal(target.screenSize.height, 480)
  assert.equal(target.isSquareBandPro, true)
  assert.equal(target.deviceDimensionsKnown, true)
  assert.equal(target.deviceInfoStatus, "ready")
})

test("8 Pro 固件若把机型上报为 watch，336×480 仍归一为 band 布局分支", () => {
  const target = resolveProfile({screenShape: "rect", deviceType: "watch", screenWidth: 336, screenHeight: 480})
  assert.equal(target.isSquareBandPro, true)
  assert.equal(target.deviceType, "band")
  assert.equal(target.screenSize.width, 336)
  assert.equal(target.screenSize.height, 480)
})

test("其他 rect 手表（320×385）不被误归一", () => {
  const target = resolveProfile({screenShape: "rect", deviceType: "watch", screenWidth: 320, screenHeight: 385})
  assert.equal(target.isSquareBandPro, false)
  assert.equal(target.deviceType, "watch")
  assert.equal(target.screenSize.width, 320)
  assert.equal(target.screenSize.height, 385)
})

test("设备信息失败时保持胶囊兜底且不误报方屏手环", () => {
  const target = resolveProfile(null)
  assert.equal(target.screenShape, "pill-shaped")
  assert.equal(target.isSquareBandPro, false)
  assert.equal(target.deviceInfoStatus, "failed")
})

test("无尺寸上报的 rect band 走 336×480 兜底（8 Pro / 9 Pro 分辨率）", () => {
  const target = resolveProfile({screenShape: "rect", deviceType: "band"})
  assert.equal(target.screenSize.width, 336)
  assert.equal(target.screenSize.height, 480)
  assert.equal(target.isSquareBandPro, true)
  assert.equal(target.deviceDimensionsKnown, false)
})

test("六个页面与公共样式均保留 rect / band-rect 布局规则，键盘含 rect 分支", () => {
  const bandRectPages = ["about/about", "datepicker/datepicker", "edit/edit", "index/index", "list/list"]
  for (const page of bandRectPages) {
    const source = fs.readFileSync(path.join(root, "src/pages", page + ".ux"), "utf8")
    assert.ok(source.includes("(device-type: band) and (shape: rect)"), page + " 缺少 band rect 媒体查询")
    assert.ok(source.includes("global.screenShape == 'rect'") || source.includes("screenShape === 'rect'") || source.includes('deviceShape == \'rect\'') || source.includes("(shape: rect)"), page + " 缺少 rect 模板/样式分支")
  }
  const ime = fs.readFileSync(path.join(root, "src/pages/ime/ime.ux"), "utf8")
  assert.ok(ime.includes("screentype==='rect'"), "键盘缺少 rect 分支")
  const appCss = fs.readFileSync(path.join(root, "src/common/app.css"), "utf8")
  assert.ok(appCss.includes("@media (shape: rect)"), "公共样式缺少 rect 规则")
})

test("manifest 对 8 Pro 的关键约束：device-width 自适应、无设备白名单字段", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/manifest.json"), "utf8"))
  assert.equal(manifest.package, "com.yzf.daymatter")
  // designWidth=device-width：按固件上报的 DP 宽度（8 Pro 为 168）自动缩放，不写死像素
  assert.equal(manifest.config.designWidth, "device-width")
  // Vela 穿戴统一以 watch 声明，覆盖手环机型；清单中不存在按机型/地区限制的字段
  assert.deepEqual(manifest.deviceTypeList, ["watch"])
  assert.ok(!("deviceList" in manifest) && !("region" in manifest))
  const features = manifest.features.map((item) => item.name).sort()
  assert.deepEqual(features, [
    "system.app",
    "system.device",
    "system.file",
    "system.interconnect",
    "system.prompt",
    "system.router",
    "system.vibrator"
  ])
})

test("日期边界（8 Pro 与其他机型共用算法）：闰年、跨年与农历入口可用", () => {
  const dateUtils = loadModule(fs.readFileSync(path.join(root, "src/components/dateUtils.js"), "utf8"), {})
  assert.equal(dateUtils.daysInMonth(2024, 2), 29)
  assert.equal(dateUtils.daysInMonth(2026, 2), 28)
  const next = dateUtils.fromDayNumber(dateUtils.toDayNumber(2026, 12, 31) + 1)
  assert.equal(next.year, 2027)
  assert.equal(next.month, 1)
  assert.equal(next.day, 1)
  const lunar = dateUtils.solarToLunar("2026-02-17")
  assert.ok(lunar && Number.isInteger(lunar.month) && Number.isInteger(lunar.day))
})

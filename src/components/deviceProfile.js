// 默认尺寸仅供布局，不能作为实际设备尺寸上报。
function createDeviceProfile(device, target) {
  const listeners = []
  let settled = false
  target.screenShape = "pill-shaped"
  target.isPillShaped = true
  target.deviceType = "band"
  target.screenSize = {width: 192, height: 490}
  target.deviceInfoReady = false
  target.deviceDimensionsKnown = false
  target.deviceInfoStatus = "loading"
  // 小米手环 8 Pro / 9 Pro 方屏机型标记（336×480 rect），供页面与测试识别目标机型类别
  target.isSquareBandPro = false
  function subscribe(handler) {
    listeners.push(handler)
    return () => {
      const index = listeners.indexOf(handler)
      if (index >= 0) listeners.splice(index, 1)
    }
  }
  function finish(data) {
    if (settled) return
    settled = true
    const info = data || {}
    const shape = info.screenShape === "rect" || info.screenShape === "circle" ? info.screenShape : "pill-shaped"
    const validSize = Number.isInteger(info.screenWidth) && info.screenWidth > 0 && info.screenWidth <= 4096 &&
      Number.isInteger(info.screenHeight) && info.screenHeight > 0 && info.screenHeight <= 4096
    target.screenShape = shape
    target.isPillShaped = shape === "pill-shaped"
    target.deviceType = info.deviceType === "watch" || info.deviceType === "band" ? info.deviceType : shape === "circle" ? "watch" : "band"
    const fallback = shape === "circle" ? {width: 480, height: 480} : shape === "rect"
      ? target.deviceType === "watch" ? {width: 320, height: 385} : {width: 336, height: 480}
      : {width: 192, height: 490}
    target.screenSize = validSize ? {width: info.screenWidth, height: info.screenHeight} : fallback
    // 小米手环 8 Pro / 9 Pro 均为 336×480 方屏手环；部分固件可能把机型上报为 watch。
    // 以实际上报的分辨率归一为 band，避免首页字号、名称宽度与页码偏移误走手表分支
    // （手表 rect 兜底为 320×385，与该分辨率不冲突）。仅 JS 侧归一，CSS 的
    // (device-type: watch) 媒体查询由固件渲染引擎判定，不受此处影响。
    target.isSquareBandPro = shape === "rect" && target.screenSize.width === 336 && target.screenSize.height === 480
    if (target.isSquareBandPro) target.deviceType = "band"
    target.deviceDimensionsKnown = validSize
    target.deviceInfoReady = true
    target.deviceInfoStatus = data ? "ready" : "failed"
    listeners.slice().forEach(handler => handler())
  }
  try { device.getInfo({success: finish, fail: () => finish(null)}) } catch (e) { finish(null) }
  return {subscribe}
}

export default {createDeviceProfile}

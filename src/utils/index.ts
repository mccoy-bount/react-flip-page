function easeIn(x) {
  return Math.pow(x, 2)
}

function easeOut(x) {
  return 1 - easeIn(1 - x)
}

function easeInOut(x) {
  if (x < 0.5) {
    return easeIn(x * 2) / 2
  } else {
    return 0.5 + easeOut((x - 0.5) * 2) / 2
  }
}

// 节流函数实现
function throttle(func, delay) {
  let lastExecTime = 0
  let timeoutId = null

  return function (...args) {
    const currentTime = Date.now()
    const timeSinceLastExec = currentTime - lastExecTime
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this

    // 清除之前设置的定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    // 如果距离上次执行已经超过delay，立即执行
    if (timeSinceLastExec >= delay) {
      func.apply(context, args)
      lastExecTime = currentTime
    } else {
      // 否则设置定时器，在剩余时间后执行
      timeoutId = setTimeout(() => {
        func.apply(context, args)
        lastExecTime = Date.now()
        timeoutId = null
      }, delay - timeSinceLastExec)
    }
  }
}

export { easeIn, easeOut, easeInOut, throttle }

interface Task {
  name: string
  animationFn: () => void
  finishFn: () => void
  auto: boolean
  fps: number
  duration: number
  animationFrame: number | null
}

const tasks = new Map<string, Task>()
const fps = 60
const duration = 1000

function addTask(
  name: string,
  animationFn: () => void,
  options?: {
    auto?: boolean
    fps?: number
    duration?: number
  },
  finishFn?: () => void
) {
  const oldTask = tasks.get(name)
  if (oldTask) {
    cancelAnimationFrame(oldTask.animationFrame)
  }
  const task: Task = {
    name,
    animationFn,
    finishFn,
    auto: options.auto || true,
    fps: options.fps || fps,
    duration: options.duration || duration,
    animationFrame: null,
  }
  tasks.set(name, task)
  if (task.auto) {
    runTask(name)
  }
}

function runTask(name: string) {
  const task = tasks.get(name)
  if (!task) {
    return
  }
  const startTime = Date.now()
  const frameInterval = 1000 / fps
  let preFrame = startTime

  function optimizedAnimate() {
    const t = Date.now()
    const frameTime = t - preFrame
    const animationTime = t - startTime
    preFrame = t
    if (frameTime >= frameInterval) {
      task.animationFn()
    }
    if (animationTime >= duration) {
      if (task.finishFn) task.finishFn()
      removeTask(name)
    } else {
      task.animationFrame = requestAnimationFrame(optimizedAnimate)
    }
  }

  task.animationFrame = requestAnimationFrame(optimizedAnimate)
}

function removeTask(name: string) {
  const task = tasks.get(name)
  if (!task) return
  cancelAnimationFrame(task.animationFrame)
  tasks.delete(name)
}

export { addTask, runTask, removeTask }

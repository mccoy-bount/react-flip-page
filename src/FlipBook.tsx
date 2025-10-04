import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import './flipbook.css'
import type { FlipBookProps, FlipBookHandle, SwipeEvent } from './interface'
import Matrix from './matrix'
import { addTask as addAnimationTask } from './animationTask'
import { easeInOut } from './utils'

let touchStartX = null
let touchStartY = null
let maxMove = 0
let hasTouchEvents = false
let hasPointerEvents = false
let minX = Number.MAX_VALUE
let maxX = -Number.MAX_VALUE
let animateCenter = false
const flip = {
  progress: 0,
  direction: null,
  frontImage: null,
  backImage: null,
  auto: false,
  opacity: 1,
  flipping: false,
  firstFrameRender: false,
}
const loadedImages = {}

export default function FlipBook(
  {
    pages,
    flipDuration = 1000,
    perspective = 2400,
    nPolygons = 10,
    ambient = 0.4,
    gloss = 0.6,
    singlePage = false,
    forwardDirection = 'right',
    centering = true,
    dragToFlip = true,
  }: FlipBookProps,
  ref: React.Ref<FlipBookHandle>
) {
  //---------------------------data-----------------------------------

  const [viewWidth, setViewWidth] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)
  const [imageWidth, setImageWidth] = useState(null)
  const [imageHeight, setImageHeight] = useState(null)
  const [displayedPages, setDisplayedPages] = useState(singlePage ? 1 : 2)
  //
  const [pageIndex, setPageIndex] = useState(0)
  const [firstPage, setFirstPage] = useState(0)
  const [secondPage, setSecondPage] = useState(1)
  const [polygonArray, setPolygonArray] = useState([])
  const [activeCursor, setActiveCursor] = useState(null)

  const [currentCenterOffset, setCurrentCenterOffset] = useState(null)

  const [minXVal, setMinX] = useState(minX)
  const [maxXVal, setMaxX] = useState(maxX)

  const viewport = useRef(null)
  //---------------------------data-----------------------------------
  //
  //---------------------------methods-----------------------------------
  function onResize() {
    if (!viewport.current) return
    const viewDom = viewport.current
    const width = viewDom.clientWidth
    const height = viewDom.clientHeight

    setViewWidth(width)
    setViewHeight(height)
    const displayed = width > height && !singlePage ? 2 : 1
    setDisplayedPages(displayed)
    if (displayed === 2) {
      let currentIndex = pageIndex
      currentIndex &= ~1
      setPageIndex(currentIndex)
    }
    fixFirstPage()
    minX = Number.MAX_VALUE
    maxX = -Number.MAX_VALUE
  }

  function fixFirstPage() {
    if (displayedPages === 1 && pageIndex === 0 && pages.length && !pageUrl(0)) {
      return setPageIndex(pageIndex + 1)
    }
  }

  function pageUrl(page: number) {
    return pages[page] || null
  }

  function pageUrlLoading(page) {
    const url = pageUrl(page)
    return url && loadImage(url)
  }

  function flipLeft() {
    if (!canFlipLeft || flip.flipping) {
      return
    }
    // left_to_right
    return flipStart('left', true)
  }

  function flipRight() {
    if (!canFlipRight || flip.flipping) {
      return
    }
    // right_to_left
    return flipStart('right', true)
  }

  function flipStart(direction: string, auto?: boolean) {
    if (direction !== forwardDirection) {
      if (displayedPages === 1) {
        flip.frontImage = pageUrl(pageIndex - 1)
        flip.backImage = null
      } else {
        flip.frontImage = pageUrl(firstPage)
        flip.backImage = pageUrl(pageIndex - displayedPages + 1)
      }
    } else {
      if (displayedPages === 1) {
        flip.frontImage = pageUrl(pageIndex)
        flip.backImage = null
      } else {
        flip.frontImage = pageUrl(secondPage)
        flip.backImage = pageUrl(pageIndex + displayedPages)
      }
    }
    flip.direction = direction
    flip.progress = 0
    flip.flipping = true
    flip.firstFrameRender = false
    animateCenter = false
    // todo
    // $emit(`flip-${flip.direction}-start`, page)
    if (auto) {
      flipAuto(true)
    }
  }

  function prepareTemporaryPage(forward: boolean) {
    if (forward) {
      if (displayedPages === 1) {
        setFirstPage(pageIndex + displayedPages)
      } else {
        setSecondPage(pageIndex + displayedPages + 1)
      }
    } else {
      if (displayedPages === 2) {
        setFirstPage(pageIndex - displayedPages)
      }
    }
  }

  function correctTemporaryPage(isForward: boolean) {
    if (isForward) {
      const currentPage = pageIndex + displayedPages
      setPageIndex(currentPage)
      setFirstPage(currentPage)
    } else {
      setPageIndex(pageIndex - displayedPages)
    }
  }

  function flipAuto(needTemporaryPage: boolean) {
    animateCenter = true
    const t0 = Date.now()
    const duration = flipDuration * (1 - flip.progress)
    const startRatio = flip.progress
    const forward = flip.direction === forwardDirection

    addAnimationTask(
      'flipPage',
      () => {
        const t = Date.now() - t0
        let ratio = startRatio + t / duration
        if (ratio > 1) {
          ratio = 1
        }
        flip.progress = easeInOut(ratio)
        if (ratio < 1) {
          //翻页中
          if (!flip.firstFrameRender && needTemporaryPage) {
            flip.firstFrameRender = true
            prepareTemporaryPage(forward)
          }
          genPolygonArray()
        } else {
          setPolygonArray([])
          correctTemporaryPage(forward)
        }
      },
      {},
      () => {
        flip.flipping = false
        flip.firstFrameRender = false
        setPolygonArray([])
        // todo
        // $emit(`flip-${flip.direction}-end`, page)
      }
    )
  }

  function flipRevert() {
    animateCenter = true
    const t0 = Date.now()
    const duration = flipDuration * flip.progress
    const startRatio = flip.progress
    addAnimationTask(
      'flipPage',
      () => {
        const t = Date.now() - t0
        let ratio = startRatio - t / duration
        if (ratio < 0) {
          ratio = 0
        }
        flip.progress = ratio
        if (ratio > 0) {
          genPolygonArray()
        } else {
          setPolygonArray([])
          setFirstPage(pageIndex)
          setSecondPage(pageIndex + 1)
        }
      },
      {},
      () => {
        setPolygonArray([])
        setFirstPage(pageIndex)
        setSecondPage(pageIndex + 1)
        flip.flipping = false
        flip.firstFrameRender = false
      }
    )
  }

  function swipeStart(touch: SwipeEvent) {
    if (touchStartX !== null) return
    touchStartX = touch.pageX
    touchStartY = touch.pageY
    maxMove = 0
    flip.direction = null
  }

  function swipeMove(touch: SwipeEvent) {
    if (touchStartX == null) {
      return
    }
    const x = touch.pageX - touchStartX
    const y = touch.pageY - touchStartY
    maxMove = Math.max(maxMove, Math.abs(x))
    maxMove = Math.max(maxMove, Math.abs(y))
    if (!dragToFlip) {
      return
    }
    if (Math.abs(y) > Math.abs(x)) {
      return
    }
    setActiveCursor('grabbing')
    const progress = Math.min(Math.abs(x) / imageWidth / 2, 1)
    requestAnimationFrame(() => {
      //dragToFlip----------start
      if (x > 0) {
        // left_to_right
        if (canFlipLeft) {
          if (!flip.flipping) {
            flipStart('left', false)
          } else if (flip.direction !== 'left') {
            //重置状态
            flip.firstFrameRender = false
            setFirstPage(pageIndex)
            setSecondPage(pageIndex + 1)
            flipStart('left', false)
          }
          flip.progress = progress
          genPolygonArray()
          if (!flip.firstFrameRender) {
            flip.firstFrameRender = true
            prepareTemporaryPage(flip.direction === forwardDirection)
          }
        }
      } else {
        // right_to_left
        if (canFlipRight) {
          if (!flip.flipping) {
            flip.direction = 'right'
            flipStart('right', false)
          } else if (flip.direction !== 'right') {
            //重置状态
            flip.firstFrameRender = false
            setFirstPage(pageIndex)
            setSecondPage(pageIndex + 1)
            flipStart('right', false)
          }
          flip.progress = progress
          genPolygonArray()
          if (!flip.firstFrameRender) {
            flip.firstFrameRender = true
            prepareTemporaryPage(flip.direction === forwardDirection)
          }
        }
      }
      //dragToFlip----------end
    })
    return true
  }

  function swipeEnd() {
    if (touchStartX == null) {
      return
    }
    if (flip.flipping) {
      if (flip.progress >= 0.4) {
        flipAuto(false)
      } else {
        flipRevert()
      }
    }
    touchStartX = null
    return setActiveCursor(null)
  }

  function onTouchStart(ev: React.TouchEvent<HTMLElement>) {
    hasTouchEvents = true
    swipeStart(ev.changedTouches[0])
  }

  function onTouchMove(ev: React.TouchEvent<HTMLElement>) {
    if (swipeMove(ev.changedTouches[0])) {
      if (ev.cancelable) {
        return ev.preventDefault()
      }
    }
  }

  function onTouchEnd() {
    hasTouchEvents = false
    swipeEnd()
  }

  function onPointerDown(ev) {
    if (hasTouchEvents) {
      return
    }
    hasPointerEvents = true
    if (ev.which && ev.which !== 1) {
      return
    }
    swipeStart(ev)
    try {
      return ev.target.setPointerCapture(ev.pointerId)
    } catch (error) {
      console.error(error)
    }
  }

  function onPointerMove(ev) {
    if (!hasTouchEvents) {
      swipeMove(ev)
    }
  }

  function onPointerUp(ev) {
    if (hasTouchEvents) {
      return
    }
    hasPointerEvents = false
    swipeEnd()
    try {
      return ev.target.releasePointerCapture(ev.pointerId)
    } catch (error) {
      console.error(error)
    }
  }

  function onMouseDown(ev) {
    if (hasTouchEvents || hasPointerEvents) {
      return
    }
    if (ev.which && ev.which !== 1) {
      return
    }
    return swipeStart(ev)
  }

  function onMouseMove(ev) {
    if (!(hasTouchEvents || hasPointerEvents)) {
      return swipeMove(ev)
    }
  }

  function onMouseUp() {
    if (!(hasTouchEvents || hasPointerEvents)) {
      return swipeEnd()
    }
  }

  function didLoadImage(ev) {
    if (imageWidth === null) {
      const width = (ev.target || ev.path[0]).naturalWidth
      const height = (ev.target || ev.path[0]).naturalHeight
      setImageWidth(width)
      setImageHeight(height)
      preloadImages()
    }
  }

  function preloadImages() {
    for (let i = pageIndex - 3, j = pageIndex + 3; i < j; i++) {
      pageUrlLoading(i)
    }
  }

  //todo: lazy
  function loadImage(url: string) {
    if (loadedImages[url]) {
      return url
    } else {
      const img = new Image()
      img.onload = () => {
        loadedImages[url] = img
      }
      img.src = url
      return url
    }
  }

  function goToPage(p: number) {
    if (p === null || p === page) {
      return
    }
    if (pages[0] === null) {
      if (displayedPages === 2 && p === 1) {
        setPageIndex(0)
      } else {
        setPageIndex(p)
      }
    } else {
      setPageIndex(p)
    }
    minX = Number.MAX_VALUE
    maxX = -Number.MAX_VALUE
  }

  function makePolygonArray(face: string) {
    if (!flip.direction) {
      return []
    }
    let progress = flip.progress
    let direction = flip.direction
    if (displayedPages === 1 && direction !== forwardDirection) {
      progress = 1 - progress
      direction = forwardDirection
    }
    flip.opacity = displayedPages === 1 && progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1
    const image = face === 'front' ? flip.frontImage : flip.backImage
    const polygonWidth = pageWidth / nPolygons
    let pageX = xMargin
    let originRight = false
    if (displayedPages === 1) {
      if (forwardDirection === 'right') {
        if (face === 'back') {
          originRight = true
          pageX = xMargin - pageWidth
        }
      } else {
        if (direction === 'left') {
          if (face === 'back') {
            pageX = pageWidth - xMargin
          } else {
            originRight = true
          }
        } else {
          if (face === 'front') {
            pageX = pageWidth - xMargin
          } else {
            originRight = true
          }
        }
      }
    } else {
      if (direction === 'left') {
        if (face === 'back') {
          pageX = viewWidth / 2
        } else {
          originRight = true
        }
      } else {
        if (face === 'front') {
          pageX = viewWidth / 2
        } else {
          originRight = true
        }
      }
    }
    const pageMatrix = new Matrix()
    pageMatrix.translate(viewWidth / 2)
    pageMatrix.perspective(perspective)
    pageMatrix.translate(-viewWidth / 2)
    pageMatrix.translate(pageX, yMargin)
    let pageRotation = 0
    if (progress > 0.5) {
      pageRotation = -(progress - 0.5) * 2 * 180
    }
    if (direction === 'left') {
      pageRotation = -pageRotation
    }
    if (face === 'back') {
      pageRotation += 180
    }
    if (pageRotation) {
      if (originRight) {
        pageMatrix.translate(pageWidth)
      }
      pageMatrix.rotateY(pageRotation)
      if (originRight) {
        pageMatrix.translate(-pageWidth)
      }
    }
    let theta = null
    if (progress < 0.5) {
      theta = progress * 2 * Math.PI
    } else {
      theta = (1 - (progress - 0.5) * 2) * Math.PI
    }
    if (theta === 0) {
      theta = 1e-9
    }
    const radius = pageWidth / theta
    let radian = 0
    const dRadian = theta / nPolygons
    let rotate = (dRadian / 2 / Math.PI) * 180
    let dRotate = (dRadian / Math.PI) * 180
    if (originRight) {
      rotate = (-theta / Math.PI) * 180 + dRotate / 2
    }
    if (face === 'back') {
      rotate = -rotate
      dRotate = -dRotate
    }
    minX = Number.MAX_VALUE
    maxX = -Number.MAX_VALUE
    const results = []
    for (let i = 0, j = nPolygons; i < j; i++) {
      const bgPos = `${(i / (nPolygons - 1)) * 100}% 0px`
      const m = pageMatrix.clone()
      const rad = originRight ? theta - radian : radian
      let x = Math.sin(rad) * radius
      if (originRight) {
        x = pageWidth - x
      }
      let z = (1 - Math.cos(rad)) * radius
      if (face === 'back') {
        z = -z
      }
      m.translate3d(x, 0, z)
      m.rotateY(-rotate)
      const x0 = m.transformX(0)
      const x1 = m.transformX(polygonWidth)
      maxX = Math.max(Math.max(x0, x1), maxX)
      minX = Math.min(Math.min(x0, x1), minX)
      setMinX(minX)
      setMaxX(maxX)
      const lighting = computeLighting(pageRotation - rotate, dRotate)
      radian += dRadian
      rotate += dRotate
      results.push([face + i, image, lighting, bgPos, m.toString(), Math.abs(Math.round(z))])
    }
    return results
  }

  function genPolygonArray() {
    setPolygonArray(makePolygonArray('front').concat(makePolygonArray('back')))
  }

  function computeLighting(rot, dRotate) {
    const gradients = []
    const lightingPoints = [-0.5, -0.25, 0, 0.25, 0.5]
    if (ambient < 1) {
      const blackness = 1 - ambient
      const diffuse = lightingPoints.map(d => {
        return (1 - Math.cos(((rot - dRotate * d) / 180) * Math.PI)) * blackness
      })
      gradients.push(`linear-gradient(to right,
  rgba(0, 0, 0, ${diffuse[0]}),
  rgba(0, 0, 0, ${diffuse[1]}) 25%,
  rgba(0, 0, 0, ${diffuse[2]}) 50%,
  rgba(0, 0, 0, ${diffuse[3]}) 75%,
  rgba(0, 0, 0, ${diffuse[4]}))`)
    }
    if (gloss > 0 && !IE) {
      const DEG = 30
      const POW = 200
      const specular = lightingPoints.map(d => {
        return Math.max(
          Math.cos(((rot + DEG - dRotate * d) / 180) * Math.PI) ** POW,
          Math.cos(((rot - DEG - dRotate * d) / 180) * Math.PI) ** POW
        )
      })
      gradients.push(`linear-gradient(to right,
  rgba(255, 255, 255, ${specular[0] * gloss}),
  rgba(255, 255, 255, ${specular[1] * gloss}) 25%,
  rgba(255, 255, 255, ${specular[2] * gloss}) 50%,
  rgba(255, 255, 255, ${specular[3] * gloss}) 75%,
  rgba(255, 255, 255, ${specular[4] * gloss}))`)
    }
    return gradients.join(',')
  }

  //---------------------------methods-----------------------------------

  //---------------------------computed-----------------------------------
  const page = useMemo(() => {
    if (pages[0] !== null) {
      return pageIndex + 1
    } else {
      return Math.max(1, pageIndex)
    }
  }, [pageIndex, pages])

  const canGoForward = useMemo(() => {
    return pageIndex < pages.length - displayedPages
  }, [pageIndex, displayedPages, pages.length])

  const canGoBack = useMemo(() => {
    return pageIndex >= displayedPages && !(displayedPages === 1 && !pageUrl(firstPage - 1))
  }, [pageIndex, displayedPages, firstPage])

  const canFlipLeft = useMemo(() => {
    if (forwardDirection === 'left') {
      return canGoForward
    } else {
      return canGoBack
    }
  }, [canGoBack, canGoForward, forwardDirection])

  const canFlipRight = useMemo(() => {
    if (forwardDirection === 'right') {
      return canGoForward
    } else {
      return canGoBack
    }
  }, [canGoBack, canGoForward, forwardDirection])

  const leftPage = useMemo(() => {
    if (forwardDirection === 'right' || displayedPages === 1) {
      return firstPage
    } else {
      return secondPage
    }
  }, [displayedPages, firstPage, forwardDirection, secondPage])

  const rightPage = useMemo(() => {
    if (forwardDirection === 'left') {
      return firstPage
    } else {
      return secondPage
    }
  }, [firstPage, forwardDirection, secondPage])

  const showLeftPage = useMemo(() => {
    return pageUrl(leftPage)
  }, [leftPage])

  const showRightPage = useMemo(() => {
    return pageUrl(rightPage) && displayedPages === 2
  }, [displayedPages, rightPage])

  const pageScale = useMemo(() => {
    const vw = viewWidth / displayedPages
    const xScale = vw / imageWidth
    const yScale = viewHeight / imageHeight
    const scale = xScale < yScale ? xScale : yScale
    if (scale < 1) {
      return scale
    } else {
      return 1
    }
  }, [displayedPages, imageHeight, imageWidth, viewHeight, viewWidth])

  const pageWidth = useMemo(() => {
    return Math.round(imageWidth * pageScale)
  }, [imageWidth, pageScale])

  const pageHeight = useMemo(() => {
    return Math.round(imageHeight * pageScale)
  }, [imageHeight, pageScale])

  const xMargin = useMemo(() => {
    return (viewWidth - pageWidth * displayedPages) / 2
  }, [displayedPages, pageWidth, viewWidth])

  const yMargin = useMemo(() => {
    return (viewHeight - pageHeight) / 2
  }, [pageHeight, viewHeight])

  const boundingLeft = useMemo(() => {
    if (displayedPages === 1) {
      return xMargin
    } else {
      const x = pageUrl(leftPage) ? xMargin : viewWidth / 2
      if (x < minXVal) {
        return x
      } else {
        return minXVal
      }
    }
  }, [displayedPages, leftPage, minXVal, viewWidth, xMargin])

  const boundingRight = useMemo(() => {
    if (displayedPages === 1) {
      return viewWidth - xMargin
    } else {
      const x = pageUrl(rightPage) ? viewWidth - xMargin : viewWidth / 2
      if (x > maxXVal) {
        return x
      } else {
        return maxXVal
      }
    }
  }, [displayedPages, maxXVal, rightPage, viewWidth, xMargin])

  const polygonWidth = useMemo(() => {
    let w = pageWidth / nPolygons
    w = Math.ceil(w + 1)
    return w + 'px'
  }, [nPolygons, pageWidth])

  const polygonHeight = useMemo(() => {
    return pageHeight + 'px'
  }, [pageHeight])

  const polygonBgSize = useMemo(() => {
    return `${pageWidth}px ${pageHeight}px`
  }, [pageHeight, pageWidth])

  const centerOffset = useMemo(() => {
    return centering ? Math.round(viewWidth / 2 - (boundingLeft + boundingRight) / 2) : 0
  }, [viewWidth, boundingLeft, boundingRight, centering])

  const centerOffsetSmoothed = useMemo(() => {
    return Math.round(currentCenterOffset)
  }, [currentCenterOffset])

  const IE = useMemo(() => {
    return typeof navigator !== 'undefined' && /Trident/.test(navigator.userAgent)
  }, [])

  const cursor = useMemo(() => {
    if (activeCursor) {
      return activeCursor
    } else if (IE) {
      return 'auto'
    } else if (dragToFlip) {
      return 'grab'
    } else {
      return 'auto'
    }
  }, [IE, activeCursor, dragToFlip])

  //---------------------------computed-----------------------------------
  //---------------------------mounted-----------------------------------
  useEffect(function () {
    window.addEventListener('resize', onResize, {
      passive: true,
    })
    onResize()
  }, [])
  //---------------------------mounted-----------------------------------
  //---------------------------watch-----------------------------------

  useEffect(
    function () {
      setFirstPage(pageIndex)
      setSecondPage(pageIndex + 1)
      preloadImages()
    },
    [pageIndex]
  )
  useEffect(
    function () {
      setPageIndex(0)
      fixFirstPage()
    },
    [pages]
  )
  useEffect(
    function () {
      if (!animateCenter) {
        setCurrentCenterOffset(centerOffset)
        return
      }
      const preCenterOffset = currentCenterOffset
      const startTime = new Date().getTime()
      const diff = centerOffset - preCenterOffset
      const duration = Math.abs(diff / 0.4)
      addAnimationTask(
        'centerOffset',
        () => {
          const t = new Date().getTime() - startTime
          const progress = t / duration
          if (progress >= 1) {
            // animatingCenter = false
            setCurrentCenterOffset(centerOffset)
          } else {
            // animatingCenter = true
            setCurrentCenterOffset(preCenterOffset + diff * progress)
          }
        },
        {
          duration,
        }
      )
    },
    [centerOffset]
  )

  //---------------------------mounted-----------------------------------
  useImperativeHandle(ref, () => ({
    flipLeft,
    flipRight,
    goToPage
  }))

  return (
    <div
      ref={viewport}
      className='viewport'
      style={{
        cursor: (cursor as string) === 'grabbing' ? 'grabbing' : 'auto',
      }}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onPointerMove={onPointerMove}
      onMouseMove={onMouseMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseUp={onMouseUp}>
      <div className='flip-book-container'>
        <div
          className='click-to-flip left'
          style={{ cursor: canFlipLeft ? 'pointer' : 'auto' }}
          onClick={flipLeft}
        />
        <div
          className='click-to-flip right'
          style={{ cursor: canFlipRight ? 'pointer' : 'auto' }}
          onClick={flipRight}
        />
        <div
          style={{
            background: 'yellow',
            transform: `translateX(${centerOffsetSmoothed}px)`,
          }}>
          {showLeftPage && (
            <img
              src={pageUrlLoading(leftPage)}
              className='page fixed left'
              onLoad={didLoadImage}
              style={{
                width: pageWidth + 'px',
                height: pageHeight + 'px',
                left: xMargin + 'px',
                top: yMargin + 'px',
              }}
            />
          )}
          {showRightPage && (
            <img
              src={pageUrlLoading(rightPage)}
              className='page fixed right'
              onLoad={didLoadImage}
              style={{
                width: pageWidth + 'px',
                height: pageHeight + 'px',
                left: viewWidth / 2 + 'px',
                top: yMargin + 'px',
              }}
            />
          )}
          <div
            style={{
              opacity: flip.opacity,
            }}>
            {polygonArray.map(([key, bgImage, lighting, bgPos, transform, z]) => (
              <div
                className={`polygon ${!bgImage ? 'blank' : ''}`}
                key={key}
                style={{
                  backgroundImage: bgImage && `url(${loadImage(bgImage)})`,
                  backgroundSize: polygonBgSize,
                  backgroundPosition: bgPos,
                  width: polygonWidth,
                  height: polygonHeight,
                  transform: transform,
                  zIndex: z,
                  pointerEvents: 'none',
                }}>
                <div
                  className='lighting'
                  style={{
                    display: lighting.length ? 'initial' : 'none',
                    backgroundImage: lighting,
                  }}
                />
              </div>
            ))}
          </div>
          <div
            className='bounding-box'
            style={{
              left: boundingLeft + 'px',
              top: yMargin + 'px',
              width: boundingRight - boundingLeft + 'px',
              height: pageHeight + 'px',
              cursor: cursor,
            }}
            onTouchStart={onTouchStart}
            onPointerDown={onPointerDown}
            onMouseDown={onMouseDown}
          />
        </div>
      </div>
    </div>
  )
}

import { forwardRef, useRef, useState } from 'react'
import './App.css'
import { FlipBook } from 'flipbook-react'
import 'flipbook-react/style.css'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const FlipBookComponent = forwardRef(FlipBook)

function App() {
  const [hasMouse, setHasMouse] = useState(true)
  const flipBookRef = useRef(null)
  const [page] = useState(0)

  function flipLeft() {
    flipBookRef.current?.flipLeft()
  }

  function flipRight() {
    flipBookRef.current?.flipRight()
  }

  const disabled = false
  const numPages = 6
  const pages = [null, 'images/1.jpg', 'images/2.jpg', 'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 'images/6.jpg']
  return (
    <div
      id='app'
      className={hasMouse ? 'has-mouse' : ''}
      onTouchStart={() => setHasMouse(false)}>
      <div className='action-bar'>
        <FiChevronLeft
          className={`btn left ${disabled ? 'disabled' : ''}`}
          onClick={flipLeft}
        />
        <span className='page-num'>
          Page {page} of {numPages}
        </span>
        <FiChevronRight
          className={`btn right ${disabled ? 'disabled' : ''}`}
          onClick={flipRight}
        />
      </div>
      <FlipBookComponent
        ref={flipBookRef}
        pages={pages}
      />
    </div>
  )
}

export default App

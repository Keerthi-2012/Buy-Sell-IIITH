import './App.css'
import Navbar from './components/shared/Navbar'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Welcome</h1>
      <Navbar/>
    </>
  )
}

export default App

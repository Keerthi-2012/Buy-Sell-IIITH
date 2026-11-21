import Main from './Main'
import './Home.css'
import { Footer } from './shared/Footer'

// Landing page: the hero banner with the footer pinned to the bottom.
const Home = () => {
  return (
    <div className="home-page">
      <main className="home-main">
        <Main />
      </main>

      <Footer />
    </div>
  )
}

export default Home

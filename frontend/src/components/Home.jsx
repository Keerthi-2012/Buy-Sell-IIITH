import Main from './Main'
import { Footer } from './shared/Footer'

// Landing page: the hero banner with the footer pinned to the bottom.
const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="home-main">
        <Main />
      </main>

      <Footer />
    </div>
  )
}

export default Home

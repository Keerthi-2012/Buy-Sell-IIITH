import React from 'react'
import Main from './Main'
import BrowseItems from './BrowseItems'
import { Footer } from './shared/Footer'

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Main content should grow to take available space */}
      <main className="home-main"> {/* flex-grow or flex-1 */}
        <Main />
      </main>

      <Footer />
    </div>
  )
}

export default Home

import ThemeProvider from './context/ThemeProvider.jsx'
import LoginPage from './page/login.jsx'

function App() {
  return (
    <ThemeProvider>
      <LoginPage />
    </ThemeProvider>
  )
}

export default App

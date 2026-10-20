import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { sepolia } from 'wagmi/chains'
import AgreementPage from './components/AgreementPage'
import Agreements from './components/Agreements'
import CreateAgreementPage from './components/CreateAgreementPage'
import Home from './components/Home'
import Navbar from './components/Navbar'
import TxToaster from './components/TxToaster'
import { trustLayerAddress } from './generated'

export default function App() {
  const location = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <TxToaster />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/agreements" element={<Agreements />} />
              <Route path="/create" element={<CreateAgreementPage />} />
              <Route path="/agreement/:id" element={<AgreementPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>TrustLayer is an unaudited portfolio project on the Sepolia test network. Do not use real funds.</p>
          <a href={`https://sepolia.etherscan.io/address/${trustLayerAddress[sepolia.id]}#code`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-ink">
            Verified contract <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  )
}

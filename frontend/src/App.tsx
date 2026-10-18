import { Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import AgreementPage from './components/AgreementPage'
import Home from './components/Home'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="min-h-screen bg-[#070b18] text-slate-100 selection:bg-cyan-500/30">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070b18]" />
        <div className="absolute inset-0 bg-grid opacity-[0.5]" />
        <div className="absolute inset-0 bg-glow" />
        <motion.div
          className="absolute -top-32 left-1/2 h-[700px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(ellipse at center, #22d3ee 0%, transparent 60%)' }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agreement/:id" element={<AgreementPage />} />
        </Routes>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-xs leading-relaxed text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            TrustLayer • Milestone escrow •{' '}
            <a href="https://sepolia.etherscan.io/address/0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299#code" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-4 hover:text-white/70">
              0x6A34…9299 on Sepolia
            </a>{' '}
            • Verified • No admin • No upgrade path
          </div>
          <div className="font-mono text-[11px] tracking-wide text-white/30">POLICY v1 • EVM Cancun • Solidity 0.8.28</div>
        </div>
      </footer>
    </div>
  )
}


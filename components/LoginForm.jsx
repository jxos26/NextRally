'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    <div className='min-h-screen grid place-items-center px-6 py-10' style={{ background: 'radial-gradient(120% 90% at 80% 10%, #17322A 0%, #0C1210 60%)' }}>
      <div className='w-full max-w-[420px]'>
        <div className='flex items-center gap-3 mb-9'>
          <div className='w-[38px] h-[38px] rounded-[11px] bg-lime grid place-items-center text-ink font-black text-[19px]'>N</div>
          <div className='font-black text-[26px] tracking-[-0.5px]'>NextRally</div>
        </div>
        <div className='text-[13px] uppercase tracking-[1.6px] text-mute mb-2.5'>Admin access</div>
        <h1 className='text-[30px] leading-tight font-bold tracking-[-0.8px] mb-7 text-pretty'>Sign in to run tonight&rsquo;s session.</h1>
        <form onSubmit={submit} className='flex flex-col gap-3'>
          <input type='email' defaultValue='admin@nextrally.app' className='w-full px-4 py-[15px] rounded-xl border border-line2 bg-panel2 text-[15px]' />
          <input type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Admin password' autoFocus className='w-full px-4 py-[15px] rounded-xl border border-line2 bg-panel2 text-[15px]' />
          <button type='submit' disabled={busy} className='mt-1.5 w-full py-4 rounded-xl bg-lime hover:bg-limebright text-ink text-[15px] font-bold disabled:opacity-60'>
            {busy ? 'Checking\u2026' : 'Enter session'}
          </button>
        </form>
        {error && <div className='mt-3 text-[13px] text-sand'>{error}</div>}
        <p className='mt-5 text-[13px] text-dim leading-relaxed'>Players don&rsquo;t log in. The court desk runs the queue and everyone reads the board.</p>
      </div>
    </div>
  )
}

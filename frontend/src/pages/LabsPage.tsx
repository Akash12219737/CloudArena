import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, GitBranch, Container, Loader2, CheckCircle2, Zap, ChevronRight } from 'lucide-react'
import { useLabStore } from '../store/labStore'
import type { LabType, LabTypeInfo } from '../types'
import clsx from 'clsx'

const LAB_TYPES: LabTypeInfo[] = [
  {
    type: 'linux',
    name: 'Linux Lab',
    description: 'Practice essential Linux commands in an Ubuntu 22.04 environment.',
    icon: '🐧',
    image: 'ubuntu:22.04',
    color: 'orange',
    commands: ['ls -la', 'grep -r pattern .', 'chmod +x script.sh', 'find / -name "*.conf"', 'systemctl status nginx'],
  },
  {
    type: 'git',
    name: 'Git Lab',
    description: 'Master Git workflows — branching, merging, rebasing and more.',
    icon: '🌿',
    image: 'alpine/git:latest',
    color: 'blue',
    commands: ['git init && git commit --allow-empty -m "init"', 'git branch feature/new', 'git rebase main', 'git cherry-pick abc123', 'git bisect start'],
  },
  {
    type: 'docker',
    name: 'Docker Lab',
    description: 'Build, run, inspect and manage containers with Docker-in-Docker.',
    icon: '🐳',
    image: 'docker:24-dind',
    color: 'cyan',
    commands: ['docker build -t myapp .', 'docker run -d --name web nginx', 'docker exec -it web bash', 'docker logs web -f', 'docker inspect web'],
  },
]

const colorMap: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
  orange: { border: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-400', shadow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]' },
  blue:   { border: 'border-blue-500/40',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   shadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]' },
  cyan:   { border: 'border-cyan-500/40',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   shadow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]' },
}

const LabsPage: React.FC = () => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<LabType | null>(null)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const { createLab } = useLabStore()

  const handleCreate = async () => {
    if (!selected) return
    setCreating(true)
    setErrMsg('')
    setSuccess(false)
    try {
      const lab = await createLab(selected)
      setSuccess(true)
      navigate(`/labs/${lab.id}`)
    } catch (err: any) {
      setErrMsg(err.response?.data?.detail ?? 'Failed to create lab')
      setCreating(false)
    }
  }

  return (
    <div className="animate-entrance space-y-8">
      <div>
        <h1 className="section-title text-3xl">Choose Your Lab</h1>
        <p className="text-slate-400 mt-1">Select an environment and spin up an isolated Kubernetes pod in seconds</p>
      </div>

      {/* Lab type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {LAB_TYPES.map((lab) => {
          const c = colorMap[lab.color]
          const isSelected = selected === lab.type
          return (
            <button
              key={lab.type}
              id={`select-lab-${lab.type}`}
              onClick={() => setSelected(lab.type)}
              className={clsx(
                'glass-card p-6 text-left transition-all duration-300 cursor-pointer',
                c.shadow,
                isSelected
                  ? `border-2 ${c.border} ring-1 ring-offset-0`
                  : 'border border-white/5 hover:border-white/15'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{lab.icon}</span>
                {isSelected && <CheckCircle2 className={`w-5 h-5 ${c.text}`} />}
              </div>
              <h3 className={`font-bold text-lg mb-1 ${isSelected ? c.text : 'text-white'}`}>{lab.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{lab.description}</p>

              <div className={`rounded-lg ${c.bg} border ${c.border} p-3`}>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Image</p>
                <code className="text-xs font-mono text-slate-300">{lab.image}</code>
              </div>

              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Practice commands</p>
                {lab.commands.slice(0, 3).map((cmd) => (
                  <div key={cmd} className="flex items-center gap-2 text-xs text-slate-400">
                    <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                    <code className="font-mono truncate">{cmd}</code>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Create button */}
      <div className="flex flex-col items-center gap-4">
        {errMsg && (
          <div className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errMsg}
          </div>
        )}
        {success && (
          <div className="px-5 py-3 rounded-xl bg-cyber-500/10 border border-cyber-500/20 text-cyber-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Lab created! Kubernetes is provisioning your environment…
          </div>
        )}
        <button
          id="launch-lab-btn"
          onClick={handleCreate}
          disabled={!selected || creating}
          className="btn-primary px-10 py-4 text-base"
        >
          {creating ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Provisioning…</>
          ) : (
            <><Zap className="w-5 h-5" />Launch Lab</>
          )}
        </button>
        {!selected && <p className="text-slate-500 text-sm">↑ Select a lab type above</p>}
      </div>
    </div>
  )
}

export default LabsPage

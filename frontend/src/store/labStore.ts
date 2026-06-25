import { create } from 'zustand'
import type { Lab } from '../types'
import { labApi } from '../services/api'

interface LabState {
  labs: Lab[]
  loading: boolean
  error: string | null
  fetchLabs: () => Promise<void>
  createLab: (type: string) => Promise<Lab>
  deleteLab: (id: number) => Promise<void>
}

export const useLabStore = create<LabState>((set, get) => ({
  labs: [],
  loading: false,
  error: null,

  fetchLabs: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await labApi.list()
      set({ labs: data.labs, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.detail ?? 'Failed to load labs', loading: false })
    }
  },

  createLab: async (lab_type: string) => {
    const { data } = await labApi.create(lab_type)
    set((state) => ({ labs: [data, ...state.labs] }))
    return data as Lab
  },

  deleteLab: async (id: number) => {
    await labApi.delete(id)
    set((state) => ({
      labs: state.labs.map((l) =>
        l.id === id ? { ...l, status: 'deleted' as const } : l
      ),
    }))
  },
}))

// Lab types
export type LabType = 'linux' | 'git' | 'docker'
export type LabStatus = 'pending' | 'running' | 'expired' | 'deleted' | 'error'
export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  created_at: string
}

export interface Lab {
  id: number
  user_id: number
  lab_type: LabType
  namespace_name: string
  deployment_name: string
  service_name: string
  status: LabStatus
  expires_at: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LabListResponse {
  labs: Lab[]
  total: number
}

export interface ApiError {
  detail: string
}

export interface LabTypeInfo {
  type: LabType
  name: string
  description: string
  icon: string
  image: string
  commands: string[]
  color: string
}

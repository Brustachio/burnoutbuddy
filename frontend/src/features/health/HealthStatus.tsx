import { use } from 'react'
import { StatusDot } from '../../components/ui/StatusDot'
import { useHealthStatus } from '../../hooks/useHealthStatus'

interface HealthData {
  status: 'healthy' | 'error' | 'loading'
}

export function HealthStatus() {
  const data = use(useHealthStatus()) as HealthData

  return (
    <div className="flex items-center">
      <StatusDot status={data.status} />
      <span className="text-gray-600">Status: {data.status}</span>
    </div>
  )
}

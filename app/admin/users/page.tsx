import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Users · Admin · TTLike' }

export default async function AdminUsersPage() {
  let users: Array<{ id: string; email: string; name: string | null; role: string; createdAt: Date }> = []
  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } catch {
    // DB not connected
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">User Management</h1>
        <p className="text-gray-400 text-sm">{users.length} users total</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No users found. Make sure your database is connected.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {['Email', 'Name', 'Role', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{user.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'danger' : 'default'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// API client configuration for production deployment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Health
  health: `${API_BASE_URL}/health`,
  
  // Credentials
  credentials: `${API_BASE_URL}/api/credentials`,
  checkCredentials: (userId: string) => `${API_BASE_URL}/api/credentials/${userId}`,
  deleteCredentials: (userId: string) => `${API_BASE_URL}/api/credentials/${userId}`,
  
  // Timetable
  timetable: `${API_BASE_URL}/api/timetable`,
  syncTimetable: `${API_BASE_URL}/api/timetable/sync`,
}

export default API_BASE_URL

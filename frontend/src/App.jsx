import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useEffect } from 'react'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import CartModal from './components/cart/CartModal'
import WishlistModal from './components/ui/WishlistModal'
import PrivateRoute from './routes/PrivateRoute'

import HomePage from './pages/home/HomePage'
import AboutPage from './pages/home/AboutPage'
import LoginPage from './pages/auth/Login'
import RegisterPage from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyCode from './pages/auth/VerifyCode'
import ResetPassword from './pages/auth/ResetPassword'
import PetListPage from './pages/pets/PetListPage'
import PetDetailPage from './pages/pets/PetDetailPage'
import AddPetPage from './pages/pets/AddPetPage'
import EditPetPage from './pages/pets/EditPetPage'
import ShelterListPage from './pages/shelters/ShelterListPage'
import ShelterDetailPage from './pages/shelters/ShelterDetailPage'
import UserDashboard from './pages/dashboard/UserDashboard'
import ShelterDashboard from './pages/dashboard/ShelterDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import SellerDashboard from './pages/dashboard/SellerDashboard'
import SellerOrders from './pages/dashboard/SellerOrders'
import ManageProduct from './pages/dashboard/ManageProduct'
import ProfilePage from './pages/profile/ProfilePage'
import UserProfilePage from './pages/profile/UserProfilePage'
import NotFound from './pages/NotFound'
import CalendarPage from './pages/calendar/CalendarPage'
import BKashCallback from './pages/payment/BKashCallback'
import ShopPage from './pages/shop/ShopPage'
import CheckoutPage from './pages/shop/CheckoutPage'
import ChatPage from './pages/chat/ChatPage'

import useAuthStore from './store/authStore'
import useNotificationStore from './store/notificationStore'
import useStatusStore from './store/statusStore'
import useCartStore from './store/cartStore'
import useWishlistStore from './store/wishlistStore'

import useThemeStore from './store/themeStore'

function DashboardRouter() {
  const { user } = useAuthStore()
  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'shelter_staff') return <ShelterDashboard />
  if (user?.role === 'seller') return <SellerDashboard />
  return <UserDashboard />
}

function AppShell() {
  const { isAuthenticated, fetchProfile, user } = useAuthStore()
  const { fetchNotifications, initWebSocket, closeWebSocket } = useNotificationStore()
  const { initStatusWS, closeStatusWS } = useStatusStore()
  const { isLightMode } = useThemeStore()
  const location = useLocation()

  // Global Theme Sync Guard
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [isLightMode])

  // Strict User Isolation Guard: Clear stores if account identity changes
  useEffect(() => {
    useCartStore.getState().syncUser(user?.id || null)
    useWishlistStore.getState().syncUser(user?.id || null)
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile()
      fetchNotifications()
      initWebSocket()
      initStatusWS()
      return () => {
        closeWebSocket()
        closeStatusWS()
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    let logoutTimer
    const TIMEOUT_DURATION = 30 * 60 * 1000 // 30 minutes in ms

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer)
      if (isAuthenticated && useAuthStore.getState().user?.role === 'shelter_staff') {
        logoutTimer = setTimeout(() => {
          useAuthStore.getState().logout()
          toast.error('Session expired due to inactivity. For your shelter\'s security, you have been logged out.', {
            id: 'inactivity-logout',
            icon: '🛡️',
            duration: 6000
          })
        }, TIMEOUT_DURATION)
      }
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    if (isAuthenticated && useAuthStore.getState().user?.role === 'shelter_staff') {
      resetTimer()
      events.forEach(event => window.addEventListener(event, resetTimer))
    }

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [isAuthenticated, useAuthStore.getState().user?.role])

  useEffect(() => {
    const handleOffline = () => {
      if (isAuthenticated) {
        useAuthStore.getState().logout()
        toast.error('Disconnected from internet. For your security, you have been logged out.', { 
          icon: '⚠️', 
          duration: 6000 
        })
      }
    }
    window.removeEventListener('offline', handleOffline)
    window.addEventListener('offline', handleOffline)
    return () => window.removeEventListener('offline', handleOffline)
  }, [isAuthenticated])

  const isAdminDashboard = user?.role === 'admin' && location.pathname === '/dashboard'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAdminDashboard && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pets" element={<PetListPage />} />
          <Route path="/pets/add" element={<PrivateRoute><AddPetPage /></PrivateRoute>} />
          <Route path="/pets/:id/edit" element={<PrivateRoute><EditPetPage /></PrivateRoute>} />
          <Route path="/pets/:id" element={<PetDetailPage />} />
          <Route path="/shelters" element={<ShelterListPage />} />
          <Route path="/shelters/:id" element={<ShelterDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/payment/bkash/callback" element={<PrivateRoute><BKashCallback /></PrivateRoute>} />
          
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />

          {/* Protected */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
          <Route path="/seller/products/add" element={<PrivateRoute><ManageProduct /></PrivateRoute>} />
          <Route path="/seller/products/:id/edit" element={<PrivateRoute><ManageProduct /></PrivateRoute>} />
          <Route path="/seller/orders" element={<PrivateRoute><SellerOrders /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/users/:id" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />

          <Route path="/orders" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <CartModal />
      <WishlistModal />
      {!isAdminDashboard && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        gutter={12}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(26,26,46,0.95)',
            backdropFilter: 'blur(10px)',
            color: '#eeeef8',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: '500',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            maxWidth: '500px',
          },
          success: {
            iconTheme: { primary: 'var(--orange-500)', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: {
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(30,10,10,0.96)',
            }
          }
        }}
      />
      <AppShell />
    </BrowserRouter>
  )
}
